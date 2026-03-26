const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * Fitur: Donghub Scraper (Search Mode)
 * Deskripsi: Scraper untuk Donghua (Anime China) dari Donghub.vip
 */

const BASE_URL = 'https://donghub.vip';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': `${BASE_URL}/`
};

// Helper: Generate Cookies Bypass
function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function generateCookies() {
    const ts = Date.now();
    const ga1 = `${generateRandomString(8)}.${generateRandomString(10)}`;
    const ga2 = `GS2.1.s${ts}$o1$g1$t${ts + 1000}$j35$l0$h0`;
    const pubcid = `${generateRandomString(8)}-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(12)}`;
    
    return `_ga=GA1.1.${ga1}; __dtsu=6D00${ts}67439490D2359A715FA14; _pubcid=${pubcid}; _ga_BC9Q6DVLH9=${ga2};`;
}

module.exports = (app) => {
    
    // 1. SEARCH DONGHUA (Path diubah ke /api/search/donghub)
    app.get('/api/search/donghub', async (req, res) => {
        const { q } = req.query;
        if (!q) return res.status(400).json({ status: false, message: 'Parameter "q" wajib diisi!' });

        try {
            const cookies = generateCookies();
            const response = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(q)}`, {
                headers: { ...HEADERS, 'Cookie': cookies },
                timeout: 15000
            });
            const $ = cheerio.load(response.data);
            const results = [];

            $('.listupd article.bs').each((i, el) => {
                const article = $(el);
                const link = article.find('a');
                results.push({
                    title: link.attr('title') || link.find('h2').text(),
                    url: link.attr('href'),
                    image: article.find('img').attr('src'),
                    type: article.find('.typez').text(),
                    status: article.find('.epx').text(),
                    subtitle: article.find('.sb').text(),
                    hot: article.find('.hotbadge').length > 0
                });
            });

            res.status(200).json({ status: true, result: results });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 2. GET DETAIL DONGHUA (Path diubah ke /api/search/donghub-detail)
    app.get('/api/search/donghub-detail', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" drama wajib diisi!' });

        try {
            const cookies = generateCookies();
            const response = await axios.get(url, {
                headers: { ...HEADERS, 'Cookie': cookies },
                timeout: 15000
            });
            const $ = cheerio.load(response.data);

            const detail = {
                title: $('.entry-title').first().text(),
                url: url,
                image: $('.thumb img').attr('src') || $('.bigcover img').attr('src'),
                status: $('.spe span:contains("Status:")').text().replace('Status:', '').trim(),
                released: $('.spe span:contains("Released:")').text().replace('Released:', '').trim(),
                duration: $('.spe span:contains("Duration:")').text().replace('Duration:', '').trim(),
                type: $('.spe span:contains("Type:")').text().replace('Type:', '').trim(),
                episodes_total: $('.spe span:contains("Episodes:")').text().replace('Episodes:', '').trim(),
                synopsis: $('.entry-content p').first().text().replace(/\n/g, ' ').trim(),
                genres: [],
                episodeList: []
            };

            $('.genxed a').each((i, el) => {
                detail.genres.push($(el).text());
            });

            $('.eplister ul li').each((i, el) => {
                detail.episodeList.push({
                    episode: $(el).find('.epl-num').text(),
                    title: $(el).find('.epl-title').text(),
                    releaseDate: $(el).find('.epl-date').text(),
                    url: $(el).find('a').attr('href')
                });
            });

            res.status(200).json({ status: true, result: detail });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 3. GET VIDEO LINK / WATCH (Path diubah ke /api/search/donghub-watch)
    app.get('/api/search/donghub-watch', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" episode wajib diisi!' });

        try {
            const cookies = generateCookies();
            const response = await axios.get(url, {
                headers: { ...HEADERS, 'Cookie': cookies },
                timeout: 15000
            });
            const $ = cheerio.load(response.data);
            const videoSources = [];

            // Ekstrak Iframe
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src) {
                    videoSources.push({
                        type: 'iframe',
                        url: src,
                        provider: src.includes('youtube') ? 'youtube' : src.includes('drive') ? 'gdrive' : 'embed'
                    });
                }
            });

            // Ekstrak Video tag
            $('video source').each((i, el) => {
                const src = $(el).attr('src');
                if (src) videoSources.push({ type: 'video', url: src, format: $(el).attr('type') || 'video/mp4' });
            });

            // Ekstrak Script Player (M3U8 / MP4 native)
            const playerScript = $('script:contains("player.src")').text();
            if (playerScript) {
                const matches = playerScript.match(/https?:\/\/[^\s"']+\.(?:mp4|mkv|m3u8)[^\s"']*/g);
                if (matches) {
                    matches.forEach(vid => videoSources.push({ type: 'script', url: vid }));
                }
            }

            res.status(200).json({ status: true, result: { episode_url: url, videos: videoSources } });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
};

