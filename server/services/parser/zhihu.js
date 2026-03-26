// server/services/parser/zhihu.js
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

async function zhihuParse(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'zh-CN,zh;q=0.9',
                Cookie: 'KLOOK_VISITOR_ID=1', // minimal cookie to bypass redirect
            },
            timeout: 10000,
            maxRedirects: 5,
        });

        const $ = cheerio.load(response.data);

        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('h1.QuestionHeader-title').text() ||
            $('h1').first().text() ||
            $('title').text();

        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content');

        const cover_url = $('meta[property="og:image"]').attr('content');

        // Zhihu author from meta or page structure
        const author =
            $('meta[name="author"]').attr('content') ||
            $('meta[property="article:author"]').attr('content') ||
            $('[class*="AuthorInfo-name"]').first().text() ||
            null;

        // Determine content type from URL
        let contentType = 'article';
        if (url.includes('/question/')) contentType = 'question';
        else if (url.includes('/answer/')) contentType = 'answer';
        else if (url.includes('/pin/')) contentType = 'pin';

        return {
            title: title?.trim() || '知乎内容',
            description: description?.trim() || null,
            cover_url: cover_url || null,
            author: author?.trim() || null,
            author_id: null,
            platform: 'zhihu',
            source_data: { contentType, url },
        };
    } catch (err) {
        const { genericParse } = require('./generic');
        const result = await genericParse(url);
        result.platform = 'zhihu';
        return result;
    }
}

module.exports = { zhihuParse };
