// server/services/parser/twitter.js
const axios = require('axios');
const { genericParse } = require('./generic');

async function twitterParse(url) {
    // Normalize URL (x.com → twitter.com for oEmbed)
    const normalizedUrl = url.replace('x.com', 'twitter.com');

    try {
        // Try oEmbed (works for public tweets)
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=1`;
        const response = await axios.get(oembedUrl, { timeout: 8000 });
        const data = response.data;

        // Extract author handle
        const authorMatch = data.author_url?.match(/twitter\.com\/([^\/]+)/);
        const authorHandle = authorMatch ? `@${authorMatch[1]}` : data.author_name;

        // Extract text content from HTML
        const textMatch = data.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        let description = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : null;

        return {
            title: description ? (description.slice(0, 100) + (description.length > 100 ? '...' : '')) : `${data.author_name} 的推文`,
            description,
            cover_url: null, // Twitter doesn't expose images in oEmbed
            author: data.author_name || null,
            author_id: authorMatch ? authorMatch[1] : null,
            platform: 'twitter',
            source_data: {
                author_url: data.author_url,
                html: data.html,
            },
        };
    } catch {
        // Fallback to generic parsing
        const result = await genericParse(normalizedUrl);
        result.platform = 'twitter';
        return result;
    }
}

module.exports = { twitterParse };
