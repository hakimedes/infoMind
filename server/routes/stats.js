const express = require('express');
const router = express.Router();
const queries = require('../db/queries');
const { getDb } = require('../db/init');
const { chat } = require('../services/llm');
const logger = require('../utils/logger');

// GET /api/stats (Basic stats)
router.get('/', (req, res) => {
    try {
        res.json({ success: true, data: queries.getStats() });
    } catch (err) {
        logger.error('Stats error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stats/advanced (Heatmap & Trends)
router.get('/advanced', async (req, res) => {
    try {
        let statsConfig = queries.getConfig('advanced_stats');
        let state = statsConfig ? JSON.parse(statsConfig) : { last_analyzed_date: '1970-01-01 00:00:00', points: {} };

        const db = getDb();
        const unanalyzed = db.prepare('SELECT id, title, category, created_at FROM entries WHERE created_at > ? ORDER BY created_at ASC').all(state.last_analyzed_date);

        if (unanalyzed.length > 0) {
            const batchSummary = unanalyzed.map(e => `- ${e.title} (${e.category})`).join('\n');
            const prompt = `请分析以下新增的知识收录内容，提取它们所涉及的"具体知识点"（如 Claude, Photoshop, Vue3, 认知心理学 等）。并整合入现有的知识体系中。
            
待分析内容：
${batchSummary}

请返回一个 JSON 数组，包含提取出的所有知识点。针对每个知识点，提供一个与该技术/概念严格对应的 lobe hub icon 名称（全小写，如 "claude", "photoshop", "vue", "openai"）。如果找不到合适的图标名，返回 "book"。

格式：
[
  { "name": "知识点名称", "icon": "图标代码", "count": 该知识点在上述内容中出现的次数 }
]
只返回 JSON 数组，无需解释。`;
            
            try {
                const response = await chat([{ role: 'user', content: prompt }], { maxTokens: 800 });
                const jsonMatch = response.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const newPoints = JSON.parse(jsonMatch[0]);
                    for (let p of newPoints) {
                        if (!state.points[p.name]) state.points[p.name] = { count: 0, icon: p.icon || 'book' };
                        state.points[p.name].count += p.count || 1;
                        if (p.icon && state.points[p.name].icon === "book") state.points[p.name].icon = p.icon;
                    }
                }
                state.last_analyzed_date = unanalyzed[unanalyzed.length - 1].created_at;
                queries.setConfig('advanced_stats', JSON.stringify(state));
            } catch (err) {
                logger.warn('Failed to analyze advanced stats via LLM: ' + err.message);
                // Don't update last_analyzed_date so it retries next time
            }
        }

        // Fetch trend data
        const trendData = db.prepare(`
            SELECT date(created_at) as date, COUNT(*) as count 
            FROM entries 
            GROUP BY date(created_at) 
            ORDER BY date(created_at) ASC
        `).all();

        res.json({ success: true, data: { heatmap: state.points, trend: trendData } });
    } catch (err) {
        logger.error('Advanced stats error', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
