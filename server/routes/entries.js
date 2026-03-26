// server/routes/entries.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const queries = require('../db/queries');
const { parseUrl } = require('../services/parser');
const { classifyEntry } = require('../services/classifier');
const { processBook } = require('../services/bookmaker');

// POST /api/entries - Add a new link
router.post('/', async (req, res) => {
    const { url, note, category: manualCategory, tags } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

    // Check duplicate
    const existing = queries.getEntryByUrl(url);
    if (existing) {
        return res.status(409).json({ success: false, error: 'URL already exists', data: existing });
    }

    try {
        logger.info(`Parsing URL: ${url}`);

        // 1. Parse the URL
        const parsed = await parseUrl(url);
        const entryData = { ...parsed, url, note: note || null, tags: tags || [] };

        // 2. Classify with LLM (or fallback)
        if (!manualCategory) {
            try {
                const classification = await classifyEntry(entryData);
                entryData.category = classification.category || '其他';
                entryData.sub_category = classification.sub_category || null;
                entryData.summary = entryData.summary || classification.summary || null;
                if (!entryData.tags?.length) entryData.tags = classification.tags || [];
            } catch (llmErr) {
                logger.warn(`LLM classification failed, using default: ${llmErr.message}`);
                entryData.category = '其他';
            }
        } else {
            entryData.category = manualCategory;
        }

        // 3. Book merging
        try {
            const book = await processBook(entryData);
            if (book) entryData.book_id = book.id;
        } catch (bookErr) {
            logger.warn(`Book processing failed: ${bookErr.message}`);
        }

        // 4. Save to DB
        const entry = queries.createEntry(entryData);
        logger.success(`Entry created: ${entry.id} - ${entry.title}`);

        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        logger.error('Failed to create entry', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/entries/search - Search entries
router.get('/search', (req, res) => {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    try {
        const results = queries.searchEntries(q, { limit: parseInt(limit) || 50 });
        res.json({ success: true, data: results, total: results.length });
    } catch (err) {
        logger.error('Search error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/entries - List entries
router.get('/', (req, res) => {
    const { category, platform, sort, page, limit } = req.query;
    try {
        const result = queries.listEntries({
            category, platform, sort,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        logger.error('List entries error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/entries/:id - Get single entry
router.get('/:id', (req, res) => {
    const entry = queries.getEntryById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, data: entry });
});

// PUT /api/entries/:id - Update entry
router.put('/:id', (req, res) => {
    try {
        const entry = queries.updateEntry(req.params.id, req.body);
        if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
        res.json({ success: true, data: entry });
    } catch (err) {
        logger.error('Update entry error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/entries/:id - Delete entry
router.delete('/:id', (req, res) => {
    const deleted = queries.deleteEntry(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, message: 'Entry deleted' });
});

module.exports = router;
