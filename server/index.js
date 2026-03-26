// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/init');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.INFOMIND_PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (Web UI)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/entries', require('./routes/entries'));
app.use('/api/books', require('./routes/books'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/config', require('./routes/config'));
app.use('/api/webhook', require('./routes/webhook'));

// Stats
app.get('/api/stats', (req, res) => {
    try {
        const { getStats } = require('./db/queries');
        res.json({ success: true, data: getStats() });
    } catch (err) {
        logger.error('Stats error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize and start
try {
    initDb();
    app.listen(PORT, () => {
        logger.success(`🧠 InfoMind server running at http://localhost:${PORT}`);
        logger.info(`📚 Web UI: http://localhost:${PORT}`);
        logger.info(`🔌 API:    http://localhost:${PORT}/api`);
    });
} catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
}

module.exports = app;
