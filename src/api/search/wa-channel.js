const axios = require('axios');

/**
 * Scraper Logic WhatsApp Channel
 */
async function searchWAChannel(url) {
    const headers = {
        'host': 'back.asitha.top',
        'sec-ch-ua-platform': '"Android"',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzVhMWY3MTE0YWI3MTE5ZmM4ZTViMyIsImlhdCI6MTc3NDk2NDYwMywiZXhwIjoxNzc1NTY5NDAzfQ.6tyg2Qa9KrxsEEp6K6_nECfwrhZjBZmG3r-AnzS-_Eo',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://asitha.top',
        'referer': 'https://asitha.top/'
    };

    try {
        // 1. Fetch metadata dari API proxy
        const { data: resData } = await axios.get(`https://back.asitha.top/api/channel/metadata-proxy`, {
            params: { url: url },
            headers: headers
        });

        // 2. Fetch HTML asli untuk dapetin foto profil HD via OpenGraph
        const { data: html } = await axios.get(url);
        const image = html.match(/<meta property="og:image" content="(.*?)"/)?.[1]?.replace(/&amp;/g, '&') || resData.preview;

        return {
            id: resData.jid,
            name: resData.name,
            followers: resData.followers,
            description: resData.description || "",
            photo: image,
            invite_code: url.split('/').filter(Boolean).pop()
        };
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message);
    }
}

/**
 * Export untuk Auto-Loader Base PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/search/wa-channel?url=...
    app.get('/api/search/wa-channel', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.json({ 
                status: false, 
                message: "Masukkan parameter 'url' Channel WhatsApp." 
            });
        }

        if (!url.includes('whatsapp.com/channel/')) {
            return res.json({ 
                status: false, 
                message: "URL tidak valid. Pastikan link Channel WhatsApp benar." 
            });
        }

        try {
            const result = await searchWAChannel(url);
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
