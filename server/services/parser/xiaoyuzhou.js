// server/services/parser/xiaoyuzhou.js
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function xiaoyuzhouParse(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Referer: 'https://www.xiaoyuzhoufm.com/',
        },
        timeout: 10000,
        maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const get = (selectors) => {
        for (const selector of selectors) {
            const value = $(selector).attr('content') || $(selector).text();
            const cleaned = cleanText(value);
            if (cleaned) return cleaned;
        }
        return null;
    };

    const rawTitle = get([
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title',
    ]);
    const h1Title = get(['h1']);
    const metaDescription = cleanDescription(get([
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
        '[class*="description"]',
    ]));
    const coverUrl = absolutizeUrl(get([
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
    ]), url);
    const siteName = get(['meta[property="og:site_name"]']);
    const contentType = detectXiaoyuzhouContentType(url);
    const structuredData = getPodcastStructuredData($, contentType);
    const series = structuredData?.partOfSeries || (isType(structuredData, 'PodcastSeries') ? structuredData : null);
    const seriesName = cleanText(series?.name) || extractPodcastNameFromDescription(metaDescription);
    const structuredTitle = cleanText(structuredData?.name);
    const structuredDescription = cleanDescription(structuredData?.description);
    const parsedTitle = parseXiaoyuzhouTitle(rawTitle, h1Title, contentType);

    return {
        title: structuredTitle || parsedTitle.title || h1Title || rawTitle || url,
        description: structuredDescription || metaDescription,
        cover_url: coverUrl,
        author: parsedTitle.author || seriesName || siteName || '小宇宙',
        author_id: extractXiaoyuzhouId(series?.url) || (contentType === 'podcast' ? extractXiaoyuzhouId(url) : null),
        platform: 'xiaoyuzhou',
        source_data: {
            contentType,
            rawTitle,
            h1Title,
            siteName,
            seriesName,
            seriesUrl: series?.url || null,
            publishedAt: structuredData?.datePublished || null,
            duration: structuredData?.timeRequired || null,
            audioUrl: structuredData?.associatedMedia?.contentUrl || null,
            url,
        },
    };
}

function parseXiaoyuzhouTitle(rawTitle, h1Title, contentType) {
    const cleaned = stripXiaoyuzhouSuffix(rawTitle);
    if (!cleaned) return { title: h1Title || null, author: null };

    if (contentType === 'episode') {
        const delimiter = cleaned.lastIndexOf(' - ');
        if (delimiter > 0) {
            return {
                title: cleanText(cleaned.slice(0, delimiter)) || h1Title || cleaned,
                author: cleanText(cleaned.slice(delimiter + 3)) || null,
            };
        }
        return { title: h1Title || cleaned, author: null };
    }

    if (contentType === 'podcast') {
        return { title: cleaned, author: cleaned };
    }

    return { title: h1Title || cleaned, author: null };
}

function stripXiaoyuzhouSuffix(title) {
    return cleanText(title)
        ?.replace(/\s*\|\s*小宇宙.*$/u, '')
        .replace(/\s*-\s*听播客，上小宇宙.*$/u, '')
        .trim() || null;
}

function detectXiaoyuzhouContentType(url) {
    const pathname = safePathname(url);
    if (/\/episode\//i.test(pathname)) return 'episode';
    if (/\/podcast\//i.test(pathname)) return 'podcast';
    return 'xiaoyuzhou';
}

function getPodcastStructuredData($, contentType) {
    const candidates = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const parsed = safeJsonParse($(el).text());
        collectStructuredCandidates(parsed, candidates);
    });

    const preferredType = contentType === 'episode' ? 'PodcastEpisode' : 'PodcastSeries';
    return candidates.find(item => isType(item, preferredType))
        || candidates.find(item => isType(item, 'PodcastEpisode') || isType(item, 'PodcastSeries'))
        || null;
}

function collectStructuredCandidates(value, candidates) {
    if (!value) return;
    if (Array.isArray(value)) {
        value.forEach(item => collectStructuredCandidates(item, candidates));
        return;
    }
    if (typeof value !== 'object') return;
    if (Array.isArray(value['@graph'])) collectStructuredCandidates(value['@graph'], candidates);
    candidates.push(value);
}

function isType(item, type) {
    const value = item?.['@type'];
    return Array.isArray(value) ? value.includes(type) : value === type;
}

function cleanDescription(value) {
    return cleanText(value)
        ?.replace(/^听播客，上小宇宙！?\s*点击下载\s*/u, '')
        .replace(/\s*在小宇宙打开\s*$/u, '')
        .trim() || null;
}

function extractPodcastNameFromDescription(value) {
    const match = cleanText(value)?.match(/听[《「](.+?)[》」]上小宇宙/u);
    return cleanText(match?.[1]);
}

function extractXiaoyuzhouId(url) {
    const pathname = safePathname(url);
    const match = pathname.match(/\/(?:episode|podcast)\/([^/?#]+)/i);
    return match?.[1] || null;
}

function cleanText(value) {
    return String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || null;
}

function absolutizeUrl(value, baseUrl) {
    const cleaned = cleanText(value);
    if (!cleaned) return null;
    try {
        return new URL(cleaned, baseUrl).toString();
    } catch {
        return cleaned;
    }
}

function safePathname(url) {
    try {
        return new URL(url).pathname || '';
    } catch {
        return '';
    }
}

function safeJsonParse(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

module.exports = { xiaoyuzhouParse, parseXiaoyuzhouTitle };
