const axios = require('axios');

/**
 * Scraper Logic SoundCloud
 */
async function scloudsave(url) {
    try {
        // Validasi URL sederhana
        if (!/soundcloud\.com/.test(url)) throw new Error('Invalid SoundCloud Track URL.');

        // 1. Get CF Turnstile Token dari API Helper
        const { data: cf } = await axios.post('https://rynekoo-cf.hf.space/action', {
            url: 'https://scloudsave.com/en3',
            siteKey: '0x4AAAAAABo8VyXHqAWxkSEl',
            mode: 'turnstile-min'
        });

        if (!cf?.data?.token) throw new Error('Gagal mendapatkan bypass token Cloudflare.');

        const inst = axios.create({
            baseURL: 'https://api.scloudsave.com',
            headers: {
                'origin': 'https://scloudsave.com',
                'referer': 'https://scloudsave.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // 2. Get Session Token
        const { data: t } = await inst.get('/session', {
            headers: {
                'x-turnstile-token': cf.data.token
            }
        });

        if (!t?.sessionToken) throw new Error('Gagal mendapatkan session token.');
        inst.defaults.headers.common['x-token'] = t.sessionToken;

        // 3. Get Metadata Track
        const { data: meta } = await inst.get('/track', {
            params: { url: url }
        });

        if (!meta?.trackUrl) throw new Error('Metadata lagu tidak ditemukan.');

        // 4. Get Download Link
        const { data: aud } = await inst.get('/dl', {
            params: { url: meta.trackUrl }
        });

        return {
            metadata: {
                id: meta.id,
                title: meta.title,
                artists: meta.artists,
                duration: `${String(Math.floor(Math.floor(meta.duration / 1000) / 60)).padStart(2, '0')}:${String(Math.floor(meta.duration / 1000) % 60).padStart(2, '0')}`,
                album: meta.album,
                cover: meta.cover,
                url: url
            },
            download_url: aud.url
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Export Route untuk Base API-PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/downloader/soundcloud?url=...
    app.get('/api/downloader/soundcloud', async (req, res) => {
        const { url } = req.query;

        if (!url) return res.json({ status: false, message: "Masukkan parameter 'url' SoundCloud." });

        try {
            const result = await scloudsave(url);
            res.json({
                status: true,
                result: result
            });
        } catch (error) {
            res.json({
                status: false,
                message: error.message
            });
        }
    });
};
