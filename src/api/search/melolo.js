const axios = require('axios');

/**
 * Fitur: SankaAnime / Melolo Scraper (Search Mode)
 * Deskripsi: Scraper untuk konten drama/anime dari Sankanime (Mode Melolo).
 */

const BASE_URL = "https://v4.sankanime.com";
const MODE = "melolo";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

async function fetchHTML(url) {
    try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        return res.data;
    } catch (e) {
        throw new Error(`Gagal mengambil data dari source: ${e.message}`);
    }
}

function extractAll(html, pattern) {
    const results = [];
    let match;
    const re = new RegExp(pattern.source, "g" + (pattern.flags.replace("g", "") || ""));
    while ((match = re.exec(html)) !== null) {
        results.push(match.groups || match);
    }
    return results;
}

function decodeEntities(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#34;/g, '"')
        .replace(/&#38;/g, "&");
}

module.exports = (app) => {
    
    // 1. SEARCH DRAMA (Path disesuaikan ke /api/search/melolo)
    app.get('/api/search/melolo', async (req, res) => {
        const { q } = req.query;
        if (!q) return res.status(400).json({ status: false, message: 'Parameter "q" (query) wajib diisi.' });

        try {
            const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}&mode=${MODE}`;
            const html = await fetchHTML(url);
            const cardPattern = /href="\/detail\/(?<id>\d+)\?mode=melolo"[\s\S]*?<h3[^>]*>[\s\S]*?(?<title>[A-Z][^<]{2,100}?)[\s\S]*?(?<eps>\d+)\s*Eps?/;
            const matches = extractAll(html, cardPattern);
            const seen = new Set();
            const results = [];

            for (const m of matches) {
                const id = m.id;
                const title = decodeEntities(m.title?.trim());
                if (!id || !title || seen.has(id)) continue;
                seen.add(id);
                results.push({
                    title,
                    id,
                    url: `${BASE_URL}/detail/${id}?mode=${MODE}`,
                    episodes: parseInt(m.eps) || null,
                });
            }
            res.status(200).json({ status: true, result: results });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 2. LATEST (Path disesuaikan ke /api/search/melolo-latest)
    app.get('/api/search/melolo-latest', async (req, res) => {
        try {
            const html = await fetchHTML(`${BASE_URL}/?mode=${MODE}`);
            const cardPattern = /href="\/detail\/(?<id>\d+)\?mode=melolo"[^>]*>[\s\S]*?alt="(?<title>[^"]+)"[\s\S]*?<p[^>]*>(?<eps>\d+)\s*Ep<\/p>/;
            const matches = extractAll(html, cardPattern);
            const seen = new Set();
            const results = [];

            for (const m of matches) {
                const id = m.id;
                if (!id || seen.has(id)) continue;
                seen.add(id);
                results.push({
                    title: decodeEntities(m.title),
                    id: id,
                    url: `${BASE_URL}/detail/${id}?mode=${MODE}`,
                    episodes: parseInt(m.eps) || null,
                });
            }
            res.status(200).json({ status: true, result: results });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 3. DETAIL (Path disesuaikan ke /api/search/melolo-detail)
    app.get('/api/search/melolo-detail', async (req, res) => {
        const { id } = req.query;
        if (!id) return res.status(400).json({ status: false, message: 'Parameter "id" drama wajib diisi.' });

        try {
            const html = await fetchHTML(`${BASE_URL}/detail/${id}?mode=${MODE}`);
            const titleMatch = html.match(/<h1[^>]*class="[^"]*text-primary[^"]*"[^>]*>([^<]+)<\/h1>/);
            const synopsisMatch = html.match(/<p[^>]*class="[^"]*leading-relaxed[^"]*"[^>]*>([\s\S]*?)<\/p>/);
            const epPattern = /href="\/watch\/(?<watchId>\d+)\?mode=melolo&(?:amp;)?drama_id=(?<dId>\d+)"[^>]*>\s*(?<num>\d+)\s*<\/a>/;
            const epMatches = extractAll(html, epPattern);

            const episodes = epMatches.map((m) => ({
                number: parseInt(m.num),
                watchId: m.watchId,
                url: `${BASE_URL}/watch/${m.watchId}?mode=${MODE}&drama_id=${id}`,
            }));

            res.status(200).json({
                status: true,
                result: {
                    title: decodeEntities(titleMatch?.[1]?.trim() || "Unknown"),
                    synopsis: synopsisMatch?.[1]?.trim() || "Tidak ada sinopsis.",
                    total_episodes: episodes.length,
                    episodes
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });

    // 4. WATCH (Path disesuaikan ke /api/search/melolo-watch)
    app.get('/api/search/melolo-watch', async (req, res) => {
        const { watchId, dramaId } = req.query;
        if (!watchId) return res.status(400).json({ status: false, message: 'Parameter "watchId" wajib diisi.' });

        try {
            const url = dramaId 
                ? `${BASE_URL}/watch/${watchId}?mode=${MODE}&drama_id=${dramaId}`
                : `${BASE_URL}/watch/${watchId}?mode=${MODE}`;
            
            const html = await fetchHTML(url);
            const streamsMatch = html.match(/data-streams="(\[[\s\S]*?\])"/);
            const posterMatch = html.match(/data-poster="([^"]+)"/);
            
            let streams = [];
            if (streamsMatch) {
                try {
                    const rawJson = decodeEntities(streamsMatch[1]);
                    const parsed = JSON.parse(rawJson);
                    streams = parsed.map((s) => ({
                        quality: s.quality || "Unknown",
                        size: s.size_mb || null,
                        url: s.url,
                    }));
                } catch {
                    const urlPattern = /\\?"url\\?":\\?"(?<url>https?:[^"\\]+)\\?"/;
                    const urlMatches = extractAll(streamsMatch[1], urlPattern);
                    streams = urlMatches.map((m, i) => ({ quality: `Stream ${i + 1}`, url: m.url }));
                }
            }
            res.status(200).json({
                status: true,
                result: {
                    poster: posterMatch?.[1] || null,
                    streams
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
};
