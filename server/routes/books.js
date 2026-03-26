// server/routes/books.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const queries = require('../db/queries');

// GET /api/books - List books
router.get('/', (req, res) => {
    const { category, platform, page, limit } = req.query;
    try {
        const result = queries.listBooks({
            category, platform,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 100,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        logger.error('List books error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/books/:id - Get book with entries
router.get('/:id', (req, res) => {
    const book = queries.getBookById(req.params.id);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    const entries = queries.getBookEntries(req.params.id);
    res.json({ success: true, data: { ...book, entries } });
});

module.exports = router;
