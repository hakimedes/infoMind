// server/services/llm.js - LLM service (OpenAI Compatible API)
const axios = require('axios');
// Force http adapter for Node.js 18 compatibility (avoid undici/fetch issues)
const axiosInstance = axios.create({ adapter: 'http' });
const { getConfig } = require('../db/queries');
const { decrypt } = require('../utils/crypto');
const logger = require('../utils/logger');


const CATEGORIES = [
    '人工智能', '计算机科学', '心理学', '哲学', '历史', '自然科学', '数学',
    '经济与金融', '商业与管理', '艺术与设计', '音乐', '影视与娱乐', '文学与写作',
    '政治与社会', '法律', '医学与健康', '体育与健身', '美食与烹饪', '旅行与地理',
    '游戏', '产品与技术', '教育', '工程与制造', '生态与环境', '其他'
];

function getLlmConfig() {
    const rawKey = getConfig('llm.api_key');
    const apiKey = rawKey ? decrypt(rawKey) : null;
    const baseUrl = getConfig('llm.base_url') || 'https://api.openai.com/v1';
    const model = getConfig('llm.model') || 'gpt-4o-mini';
    const provider = getConfig('llm.provider') || 'openai'; // default to openai
    return { apiKey, baseUrl, model, provider };
}

async function chat(messages, { temperature = 0.3, maxTokens = 1000 } = {}) {
    const { apiKey, baseUrl, model, provider } = getLlmConfig();
    if (!apiKey) throw new Error('LLM API key not configured. Please set it in Settings.');

    // Support Anthropic Standard API format based on provider setting
    const isAnthropic = provider === 'anthropic';

    if (isAnthropic) {
        const response = await axiosInstance.post(
            `${baseUrl.replace(/\/$/, '')}/messages`,
            { model, messages, temperature, max_tokens: maxTokens },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );
        return response.data.content[0]?.text || '';
    }

    // Default to OpenAI Compatible API format
    const response = await axiosInstance.post(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        { model, messages, temperature, max_tokens: maxTokens },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        }
    );

    return response.data.choices[0]?.message?.content || '';
}

async function classify(entry) {
    const categoriesList = CATEGORIES.join('、');
    const prompt = `你是一个内容分类助手。请根据以下内容信息进行分类。

内容标题: ${entry.title || '未知'}
内容来源平台: ${entry.platform || '未知'}
内容描述: ${entry.description || '无'}
作者: ${entry.author || '未知'}

请从以下分类中选择最匹配的一级分类：${categoriesList}

只返回 JSON，不要任何解释：
{
  "category": "分类名称",
  "sub_category": "可选子分类，可为null",
  "tags": ["关键词1", "关键词2", "关键词3"],
  "summary": "50字以内的中文摘要"
}`;

    const content = await chat([{ role: 'user', content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid LLM response format');

    const result = JSON.parse(jsonMatch[0]);
    // Validate category
    if (!CATEGORIES.includes(result.category)) result.category = '其他';
    return result;
}

async function generateBookTitle(entries) {
    if (!entries?.length) return null;
    const entrySummaries = entries.slice(0, 5).map(e => `- ${e.title || e.url}`).join('\n');

    const prompt = `我需要给同一个作者的多篇内容集合起一个书名，像一本书的标题一样简洁有力、引人入胜。

作者: ${entries[0]?.author || '未知'}
内容列表:
${entrySummaries}

请返回一个不超过15个字的中文书名（不加引号，直接返回书名）：`;

    const title = await chat([{ role: 'user', content: prompt }], { maxTokens: 50 });
    return title.trim().replace(/["'《》]/g, '');
}

async function testLlmConnection() {
    const { apiKey, baseUrl, model } = getLlmConfig();
    if (!apiKey) throw new Error('API key not configured');

    const start = Date.now();
    const response = await chat([{ role: 'user', content: '请回复"连接成功"四个字' }], { maxTokens: 20 });
    const latency = Date.now() - start;

    return { model, baseUrl, latency, response: response.trim() };
}

module.exports = { classify, generateBookTitle, testLlmConnection };
