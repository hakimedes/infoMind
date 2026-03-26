// server/routes/webhook.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');
const queries = require('../db/queries');
const { parseUrl } = require('../services/parser');
const { classifyEntry } = require('../services/classifier');
const { processBook } = require('../services/bookmaker');

// Extract URLs from a text string
function extractUrls(text) {
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    return [...new Set((text.match(urlRegex) || []))];
}

// Verify OpenClaw HMAC signature (optional, if secret is configured)
function verifySignature(req) {
    const secret = queries.getConfig('webhook.secret');
    if (!secret) return true; // No secret configured → allow all
    const signature = req.headers['x-openclaw-signature'] || req.headers['x-signature'];
    if (!signature) return false;
    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// POST /api/webhook/openclaw
router.post('/openclaw', async (req, res) => {
    if (!verifySignature(req)) {
        logger.warn('Webhook signature verification failed');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const { message, urls: providedUrls } = req.body;
    const urls = providedUrls?.length ? providedUrls : extractUrls(message || '');

    if (!urls.length) {
        return res.json({ success: true, message: 'No URLs found in message', processed: 0 });
    }

    logger.info(`Webhook received ${urls.length} URL(s): ${urls.join(', ')}`);
    const results = [];

    for (const url of urls) {
        try {
            // Dedup check
            const existing = queries.getEntryByUrl(url);
            if (existing) {
                results.push({ url, status: 'duplicate', id: existing.id, title: existing.title });
                continue;
            }

            const parsed = await parseUrl(url);
            const entryData = { ...parsed, url };

            try {
                const classification = await classifyEntry(entryData);
                entryData.category = classification.category || '其他';
                entryData.sub_category = classification.sub_category || null;
                entryData.summary = entryData.summary || classification.summary || null;
                entryData.tags = classification.tags || [];
            } catch {
                entryData.category = '其他';
            }

            try {
                const book = await processBook(entryData);
                if (book) entryData.book_id = book.id;
            } catch { /* ignore */ }

            const entry = queries.createEntry(entryData);
            results.push({ url, status: 'created', id: entry.id, title: entry.title, category: entry.category });
            logger.success(`Webhook entry created: ${entry.title}`);
        } catch (err) {
            logger.error(`Failed to process webhook URL: ${url}`, err);
            results.push({ url, status: 'error', error: err.message });
        }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    res.json({
        success: true,
        message: `Processed ${urls.length} URL(s), ${successCount} added`,
        results
    });
});

module.exports = router;
