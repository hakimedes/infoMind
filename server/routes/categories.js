// server/routes/categories.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const queries = require('../db/queries');

// GET /api/categories
router.get('/', (req, res) => {
    try {
        const categories = queries.listCategories();
        res.json({ success: true, data: categories });
    } catch (err) {
        logger.error('List categories error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
