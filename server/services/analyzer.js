// server/services/analyzer.js
const crypto = require('crypto');
const { chat, getConfiguredModel } = require('./llm');
const { extractEntryContent } = require('./contentExtractor');
const queries = require('../db/queries');

const DIRECT_ANALYSIS_CHARS = 12000;
const MAX_ANALYSIS_CHARS = 36000;
const CHUNK_SIZE = 5200;

function getEntryAnalysis(entryId) {
    return queries.getEntryAnalysis(entryId);
}

async function analyzeEntry(entryId, { force = false } = {}) {
    const entry = queries.getEntryById(entryId);
    if (!entry) {
        const err = new Error('Entry not found');
        err.statusCode = 404;
        throw err;
    }

    const extracted = await extractEntryContent(entry);
    const contentHash = hashContent(extracted.text);
    const existing = queries.getEntryAnalysis(entryId);
    if (!force && existing?.status === 'done' && existing.content_hash === contentHash) {
        return existing;
    }

    if (!extracted.hasEnoughContent) {
        return queries.upsertEntryAnalysis({
            entry_id: entryId,
            status: 'needs_content',
            content_hash: contentHash,
            source_kind: extracted.sourceKind,
            source_length: extracted.sourceLength,
            model: getConfiguredModel(),
            token_budget: 'none',
            result: {
                title: entry.title || '无标题',
                reason: extracted.reason,
                required_content: getRequiredContent(entry.platform),
                mind_map: null,
            },
            error: extracted.reason,
        });
    }

    queries.upsertEntryAnalysis({
        entry_id: entryId,
        status: 'processing',
        content_hash: contentHash,
        source_kind: extracted.sourceKind,
        source_length: extracted.sourceLength,
        model: getConfiguredModel(),
        token_budget: selectTokenBudget(extracted.sourceLength),
        result: {},
        error: null,
    });

    try {
        const result = await generateStructuredAnalysis(entry, extracted.text);
        return queries.upsertEntryAnalysis({
            entry_id: entryId,
            status: 'done',
            content_hash: contentHash,
            source_kind: extracted.sourceKind,
            source_length: extracted.sourceLength,
            model: getConfiguredModel(),
            token_budget: selectTokenBudget(extracted.sourceLength),
            result,
            error: null,
        });
    } catch (err) {
        return queries.upsertEntryAnalysis({
            entry_id: entryId,
            status: 'failed',
            content_hash: contentHash,
            source_kind: extracted.sourceKind,
            source_length: extracted.sourceLength,
            model: getConfiguredModel(),
            token_budget: selectTokenBudget(extracted.sourceLength),
            result: {},
            error: err.message,
        });
    }
}

async function generateStructuredAnalysis(entry, text) {
    const clipped = text.slice(0, MAX_ANALYSIS_CHARS);
    if (clipped.length <= DIRECT_ANALYSIS_CHARS) {
        return generateFinalMindMap(entry, clipped, []);
    }

    const chunks = chunkText(clipped, CHUNK_SIZE);
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i += 1) {
        chunkSummaries.push(await summarizeChunk(entry, chunks[i], i + 1, chunks.length));
    }
    return generateFinalMindMap(entry, chunkSummaries.join('\n\n'), chunkSummaries);
}

async function summarizeChunk(entry, chunk, index, total) {
    const prompt = `你在为个人知识库做长内容分段解读。请只基于本段内容提取事实和观点，不要臆测。

内容标题：${entry.title || '无标题'}
平台：${entry.platform || '未知'}
分段：${index}/${total}

本段内容：
${chunk}

请返回 JSON，不要解释：
{
  "segment": "${index}/${total}",
  "claims": ["本段核心观点1", "本段核心观点2"],
  "knowledge_points": ["知识点1", "知识点2"],
  "evidence": ["支撑材料或原文线索1", "支撑材料或原文线索2"],
  "questions": ["值得继续追问的问题"]
}`;
    const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 900, timeout: 90000 });
    return JSON.stringify(parseJsonObject(text));
}

async function generateFinalMindMap(entry, content, chunkSummaries = []) {
    const prompt = `你是一个严谨的知识管理分析器。请基于给定内容生成“真实内容解读思维导图”，用于个人知识库详情页展示。

要求：
1. 只基于内容本身，不要补充外部知识或编造细节。
2. 输出观点、知识点和证据线索，不要只复述标题。
3. 如果内容是分段摘要，请综合各段，保留重要脉络。
4. 节点名称要短，detail 可以稍长。
5. 返回严格 JSON，不要 Markdown，不要解释。

内容元信息：
- 标题：${entry.title || '无标题'}
- 作者：${entry.author || '未知'}
- 平台：${entry.platform || '未知'}
- 分类：${entry.category || '未分类'}
- 标签：${Array.isArray(entry.tags) ? entry.tags.join('、') : ''}
- 分段摘要数量：${chunkSummaries.length}

内容：
${content}

JSON 结构：
{
  "title": "内容标题",
  "thesis": "一句话概括核心论点",
  "mind_map": {
    "root": "中心主题",
    "nodes": [
      {
        "label": "一级节点",
        "summary": "该节点概括",
        "children": [
          {
            "label": "二级节点",
            "detail": "具体解释",
            "evidence": "来自内容的支撑线索，可为空"
          }
        ]
      }
    ]
  },
  "knowledge_points": ["关键知识点"],
  "questions": ["值得继续追问的问题"],
  "content_coverage": "说明本次解读依据的内容范围",
  "limitations": ["如果内容不足或存在限制，在这里说明"]
}`;

    const response = await chat([{ role: 'user', content: prompt }], { temperature: 0.25, maxTokens: 2200, timeout: 90000 });
    return normalizeAnalysisResult(parseJsonObject(response), entry);
}

function normalizeAnalysisResult(result, entry) {
    const nodes = Array.isArray(result?.mind_map?.nodes) ? result.mind_map.nodes : [];
    return {
        title: result.title || entry.title || '无标题',
        thesis: result.thesis || '',
        mind_map: {
            root: result?.mind_map?.root || result.title || entry.title || '内容解读',
            nodes: nodes.slice(0, 6).map(node => ({
                label: String(node.label || '要点').slice(0, 40),
                summary: String(node.summary || '').slice(0, 140),
                children: Array.isArray(node.children)
                    ? node.children.slice(0, 5).map(child => ({
                        label: String(child.label || '知识点').slice(0, 48),
                        detail: String(child.detail || '').slice(0, 180),
                        evidence: String(child.evidence || '').slice(0, 180),
                    }))
                    : [],
            })),
        },
        knowledge_points: Array.isArray(result.knowledge_points) ? result.knowledge_points.slice(0, 8) : [],
        questions: Array.isArray(result.questions) ? result.questions.slice(0, 5) : [],
        content_coverage: result.content_coverage || '基于当前可获取正文生成',
        limitations: Array.isArray(result.limitations) ? result.limitations.slice(0, 4) : [],
    };
}

function parseJsonObject(text) {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid LLM analysis response');
    return JSON.parse(match[0]);
}

function chunkText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
    return chunks;
}

function hashContent(text) {
    return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function selectTokenBudget(length) {
    if (length <= DIRECT_ANALYSIS_CHARS) return 'medium';
    return 'chunked';
}

function getRequiredContent(platform) {
    if (['bilibili', 'youtube'].includes(platform)) return '字幕、视频转录文本或人工整理稿';
    if (platform === 'xiaoyuzhou') return '播客文稿或音频转录文本';
    if (platform === 'xiaohongshu') return '帖子正文、图片 OCR 或浏览器抓取正文';
    return '正文内容或可读网页文本';
}

module.exports = { getEntryAnalysis, analyzeEntry };
