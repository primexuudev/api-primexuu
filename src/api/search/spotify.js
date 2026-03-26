const axios = require('axios');

/**
 * Fitur: Spotify Search
 * Deskripsi: Mencari lagu di Spotify menggunakan akses token dari Web Player.
 */

// URL Asli Spotify (Bukan googleusercontent)
const SPOTIFY_WEB = 'https://open.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': `${SPOTIFY_WEB}/`,
    'Origin': SPOTIFY_WEB
};

// Helper: Ambil Akses Token dari Web Player
async function getSpotifyToken() {
    try {
        const res = await axios.get(`${SPOTIFY_WEB}/`, { 
            headers: HEADERS, 
            timeout: 10000 
        });
        const match = res.data.match(/"accessToken":"(BQ[^"]+)"/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

// Helper: Format Milidetik ke Menit:Detik
function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = ((ms % 60000) / 1000).toFixed(0);
    return `${min}:${sec.padStart(2, '0')}`;
}

/**
 * Handler Utama
 */
module.exports = (app) => {
    app.get('/api/search/spotify', async (req, res) => {
        const query = req.query.q || req.query.query;
        const limit = parseInt(req.query.limit) || 10;

        // 1. Validasi Input
        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: 'salah parameter nya aa🗿🖕 (Parameter "q" wajib diisi)' 
            });
        }

        try {
            // 2. Ambil Token
            const token = await getSpotifyToken();
            if (!token) {
                throw new Error('gagal dapatkeun token aa, sabar wee😂 (Web Player Spotify menolak request)');
            }

            const safeLimit = Math.max(1, Math.min(limit, 50)); // Batasi max 50 biar gak berat

            // 3. Request Pencarian ke API Spotify
            const response = await axios.get(`${SPOTIFY_API}/search`, {
                params: {
                    q: query,
                    type: 'track',
                    limit: safeLimit,
                    offset: 0
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 15000 // Timeout 15 detik biar Vercel aman
            });

            const data = response.data;
            if (!data.tracks || !data.tracks.items) {
                return res.status(200).json({ status: true, total: 0, result: [] });
            }

            // 4. Format Hasil
            const results = data.tracks.items.map(track => ({
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                duration: formatTime(track.duration_ms),
                popularity: track.popularity,
                releaseDate: track.album.release_date,
                imageUrl: track.album.images[0] ? track.album.images[0].url : '',
                trackUrl: `${SPOTIFY_WEB}/track/${track.id}`
            }));

            // 5. Response Sukses
            res.status(200).json({
                status: true,
                result: results
            });

        } catch (e) {
            res.status(500).json({ 
                status: false, 
                message: e.response?.data?.error?.message || e.message 
            });
        }
    });
};
