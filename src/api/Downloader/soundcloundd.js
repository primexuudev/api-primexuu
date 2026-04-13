const axios = require("axios");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fungsi untuk mengambil Client ID SoundCloud secara dinamis
 */
async function getClientId() {
    try {
        const { data: html } = await axios.get("https://soundcloud.com", { 
            headers: { "user-agent": UA } 
        });
        const id = html.match(/"client_id":"([a-zA-Z0-9]+)"/)?.[1] || 
                   html.match(/client_id\s*[:=]\s*"([a-zA-Z0-9]+)"/)?.[1];
        return id || "KKzJxmw11tYpCs6T24P4uUYhqmjalG6M"; // Fallback ID jika gagal scraping
    } catch {
        return "KKzJxmw11tYpCs6T24P4uUYhqmjalG6M";
    }
}

/**
 * Scraper Logic SoundCloud Search
 */
async function scSearch(query, limit = 10) {
    const client_id = await getClientId();
    try {
        const { data } = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
            params: {
                q: query,
                client_id,
                limit,
                offset: 0,
                linked_partitioning: 1,
                app_version: 1774459502,
                app_locale: "en"
            },
            headers: { 
                "user-agent": UA,
                "accept": "application/json"
            }
        });

        if (!data || !data.collection) return [];

        return data.collection.map(t => ({
            title: t.title,
            id: t.id,
            author: {
                username: t.user.username,
                full_name: t.user.full_name,
                avatar: t.user.avatar_url
            },
            duration: (t.duration / 1000).toFixed(0) + "s",
            thumbnail: t.artwork_url || t.user.avatar_url,
            url: t.permalink_url,
            genre: t.genre || "N/A",
            plays: t.playback_count
        }));
    } catch (e) {
        throw new Error("Gagal mencari lagu: " + e.message);
    }
}

/**
 * Export Route untuk Auto-Loader Base PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/search/soundcloud?q=...
    app.get('/api/downloader/soundcloud', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.json({ 
                status: false, 
                message: "Masukkan parameter 'q' untuk mencari lagu." 
            });
        }

        try {
            const results = await scSearch(q);
            res.json({
                status: true,
                results: results
            });
        } catch (error) {
            res.json({
                status: false,
                message: error.message
            });
        }
    });
};
