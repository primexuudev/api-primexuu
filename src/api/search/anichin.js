const axios = require('axios');
const cheerio = require('cheerio'); // Kita gunakan cheerio sebagai pelengkap regex bawaanmu

/**
 * Fitur: Anichin Scraper
 * Deskripsi: Scraper Donghua dari anichin.cafe
 */

const BASE_URL = "https://anichin.cafe";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 16; ASUS_AI2401_A Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
};

// --- HELPER REGEX ASLI DARI INDRA ---
function decodeHtml(value) {
    if (!value) return value;
    return value.replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&#8230;/g, "...")
        .replace(/&#160;/g, " ");
}

function stripTags(value) {
    return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeUrl(value) {
    if (!value) return value;
    return value.startsWith("//") ? `https:${value}` : value;
}

function matchAll(text, regex, mapFn) {
    const out = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        out.push(mapFn(match));
    }
    return out;
}

/**
 * Handler Utama
 */
module.exports = (app) => {

    // 1. GET LATEST (DASHBOARD) ATAU SEARCH
    app.get('/api/search/anichin', async (req, res) => {
        const { q } = req.query; // Opsional: Bisa buat search juga
        
        try {
            const url = q ? `${BASE_URL}/?s=${encodeURIComponent(q)}` : BASE_URL;
            const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
            
            // Menggunakan kombinasi Cheerio agar lebih stabil saat search
            const $ = cheerio.load(data);
            const results = [];
            const seen = new Set();

            $('.bsx, .series').each((i, el) => {
                const title = $(el).find('a').attr('title') || $(el).attr('title') || $(el).text().trim();
                const link = $(el).find('a').attr('href') || $(el).attr('href');
                const image = $(el).find('img').attr('src');
                const ep = $(el).find('.epx').text().trim() || $(el).find('.adds .epx').text().trim();

                const cleanTitle = decodeHtml(title).trim();
                const cleanLink = normalizeUrl(link);

                if (cleanTitle && cleanLink && !seen.has(cleanLink)) {
                    seen.add(cleanLink);
                    results.push({
                        title: cleanTitle,
                        url: cleanLink,
                        image: normalizeUrl(image),
                        episode: ep || "Unknown"
                    });
                }
            });

            res.status(200).json({ status: true, result: results });
        } catch (e) {
            res.status(500).json({ status: false, message: "Gagal mengambil data Anichin: " + e.message });
        }
    });

    // 2. GET DETAIL & EPISODE LIST
    app.get('/api/search/anichin-detail', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" wajib diisi!' });

        try {
            const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(data);

            const detail = {
                title: decodeHtml($('.entry-title').text().trim()),
                image: normalizeUrl($('.thumb img').attr('src')),
                synopsis: stripTags($('.entry-content').text()),
                status: $('.spe span:contains("Status:")').text().replace('Status:', '').trim(),
                studio: $('.spe span:contains("Studio:")').text().replace('Studio:', '').trim(),
                episodes: []
            };

            // Menggunakan Regex aslimu untuk daftar episode
            const blockMatch = data.match(/<div class="eplister">([\s\S]*?)<\/ul><\/div>/i);
            if (blockMatch) {
                detail.episodes = matchAll(
                    blockMatch[1],
                    /<li[^>]*>\s*<a href="([^"]+)"><div class="epl-num">([^<]+)<\/div><div class="epl-title">([^<]+)<\/div><div class="epl-date">([^<]+)<\/div>/gi,
                    (match) => ({
                        episode: decodeHtml(match[2]).trim(),
                        title: decodeHtml(match[3]).trim(),
                        date: decodeHtml(match[4]).trim(),
                        watchUrl: normalizeUrl(match[1])
                    })
                );
            }

            res.status(200).json({ status: true, result: detail });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 3. GET VIDEO & DOWNLOAD LINKS (WATCH)
    app.get('/api/search/anichin-watch', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" episode wajib diisi!' });

        try {
            const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(data);

            // 1. Ekstrak Video Player
            const playerUrls = [
                ...new Set(
                    matchAll(data, /<iframe[^>]*src="([^"]+)"/gi, (match) => normalizeUrl(match[1]))
                )
            ];

            // 2. Ekstrak Link Download menggunakan Regex aslimu
            const downloadSections = matchAll(
                data,
                /<div class="sorattlx"><h3>([^<]+)<\/h3><\/div><div class="soraurlx">([\s\S]*?)(?=<\/div><\/div>|<div class="sorattlx">)/gi,
                (match) => ({
                    label: decodeHtml(match[1]),
                    links: matchAll(
                        match[2],
                        /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
                        (linkMatch) => ({
                            text: stripTags(linkMatch[2]),
                            url: normalizeUrl(linkMatch[1])
                        })
                    )
                })
            ).filter(section => section.links.length > 0);

            res.status(200).json({
                status: true,
                result: {
                    title: decodeHtml($('.entry-title').text().trim()),
                    episode_url: url,
                    players: playerUrls,
                    downloads: downloadSections
                }
            });

        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
};
