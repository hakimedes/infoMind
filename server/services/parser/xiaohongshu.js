// server/services/parser/xiaohongshu.js
const { genericParse } = require('./generic');

async function xiaohongshuParse(url) {
    // Xiaohongshu (Little Red Book) - heavily protected, use generic parser
    // Short links (xhslink.com) will be followed via axios redirects
    try {
        const result = await genericParse(url);
        result.platform = 'xiaohongshu';
        // Try to extract author from URL pattern: /user/profile/{userId}
        const userMatch = url.match(/user\/profile\/([a-zA-Z0-9]+)/);
        if (userMatch) result.author_id = userMatch[1];
        return result;
    } catch (err) {
        return {
            title: '小红书内容',
            description: null,
            cover_url: null,
            author: null,
            author_id: null,
            platform: 'xiaohongshu',
            source_data: { url, error: err.message },
        };
    }
}

module.exports = { xiaohongshuParse };
