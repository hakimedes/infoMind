// server/services/parser/zhihu.js
const axios = require('axios');
const cheerio = require('cheerio');

// Zhihu needs very specific headers to avoid 403 / JS-only pages
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9',
};

async function zhihuParse(url) {
    // Determine content type from URL
    let contentType = 'article';
    if (url.includes('/question/')) contentType = 'question';
    if (url.match(/\/answer\//)) contentType = 'answer';
    if (url.includes('/p/')) contentType = 'article';
    if (url.includes('/pin/')) contentType = 'pin';

    try {
        // Googlebot UA is the most reliable way to get server-rendered content from Zhihu
        const response = await axios.get(url, {
            headers: HEADERS,
            timeout: 12000,
            maxRedirects: 5,
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // ── Strategy 1: Extract from embedded initialData JSON ───
        const scriptTag = $('#js-initialData');
        if (scriptTag.length) {
            try {
                const initData = JSON.parse(scriptTag.html());
                const result = extractFromInitialData(initData, contentType, url);
                if (result && result.title) return result;
            } catch (e) { /* continue to OG tags */ }
        }

        // ── Strategy 2: OG meta tags (always server-rendered for SEO) ───
        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('h1.QuestionHeader-title').text().trim() ||
            $('h1').first().text().trim() ||
            $('title').text().trim();

        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') || '';

        const cover_url =
            $('meta[property="og:image"]').attr('content') || null;

        const author =
            $('meta[name="author"]').attr('content') ||
            $('[class*="AuthorInfo-name"]').first().text().trim() ||
            $('[class*="UserLink-link"]').first().text().trim() ||
            null;

        return {
            title: cleanTitle(title) || '知乎内容',
            description: description.trim().substring(0, 500) || null,
            cover_url: normalizeCover(cover_url),
            author: author || null,
            author_id: null,
            platform: 'zhihu',
            source_data: { contentType, url },
        };
    } catch (err) {
        // Fallback to generic parser
        try {
            const { genericParse } = require('./generic');
            const result = await genericParse(url);
            result.platform = 'zhihu';
            return result;
        } catch (fallbackErr) {
            return {
                title: '知乎内容',
                description: null,
                cover_url: null,
                author: null,
                author_id: null,
                platform: 'zhihu',
                source_data: { contentType, url, error: err.message },
            };
        }
    }
}

function extractFromInitialData(data, contentType, url) {
    const entities = data?.initialState?.entities;
    if (!entities) return null;

    const questions = entities.questions || {};
    const answers = entities.answers || {};
    const articles = entities.articles || {};
    const users = entities.users || {};

    // Try article
    const article = Object.values(articles)[0];
    if (article) {
        const authorObj = users[article.author] || {};
        return {
            title: article.title || '知乎文章',
            description: stripHtml(article.excerpt || '').substring(0, 500) || null,
            cover_url: normalizeCover(article.titleImage || article.imageUrl),
            author: authorObj.name || null,
            author_id: authorObj.urlToken || null,
            platform: 'zhihu',
            source_data: { contentType: 'article', url },
        };
    }

    // Try answer
    const answer = Object.values(answers)[0];
    const question = Object.values(questions)[0];
    if (answer) {
        const authorObj = users[answer.author] || {};
        return {
            title: question?.title || answer.excerpt?.substring(0, 60) || '知乎回答',
            description: stripHtml(answer.excerpt || answer.content || '').substring(0, 500) || null,
            cover_url: normalizeCover(answer.thumbnail || extractImageFromHtml(answer.content)),
            author: authorObj.name || null,
            author_id: authorObj.urlToken || null,
            platform: 'zhihu',
            source_data: { contentType: 'answer', url },
        };
    }

    // Try question only
    if (question) {
        return {
            title: question.title || '知乎问题',
            description: stripHtml(question.detail || question.excerpt || '').substring(0, 500) || null,
            cover_url: normalizeCover(question.thumbnail),
            author: null,
            author_id: null,
            platform: 'zhihu',
            source_data: { contentType: 'question', url },
        };
    }

    return null;
}

function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function extractImageFromHtml(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src="(https:\/\/pic[^"]+)"/);
    return match ? match[1] : null;
}

function normalizeCover(url) {
    if (!url) return null;
    if (url.startsWith('//')) return 'https:' + url;
    return url;
}

function cleanTitle(title) {
    if (!title) return null;
    // Remove " - 知乎" suffix
    return title.replace(/\s*[-–—]\s*知乎\s*$/, '').trim();
}

module.exports = { zhihuParse };
