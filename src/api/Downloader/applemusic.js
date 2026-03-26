const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const crypto = require('crypto');

/**
 * Fitur: Apple Music Downloader
 * Deskripsi: Bypass download Apple Music via aaplmusicdownloader
 */

const BASE_URL = 'https://aaplmusicdownloader.com';

// Helper: Generate Session & Cookies
const getHeaders = (cookie = '') => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`,
    'Cookie': cookie,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
});

module.exports = (app) => {
    app.get('/api/download/applemusic', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Masukkan parameter url Apple Music!' });

        try {
            // 1. Init Session & Auth
            const phpsessid = crypto.randomBytes(16).toString('hex');
            const initialCookie = `PHPSESSID=${phpsessid}; _ga=GA1.1.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`;

            // 2. Search Song info (Dapatkan metadata)
            const urlMatch = url.match(/\/song\/([^\/]+)\/(\d+)/);
            if (!urlMatch) throw new Error('URL Apple Music tidak valid!');

            const songName = decodeURIComponent(urlMatch[1].replace(/-/g, ' '));
            const form = new FormData();
            form.append('data', JSON.stringify([songName, '', '', '', null, url]));

            const searchRes = await axios.post(`${BASE_URL}/song.php`, form, {
                headers: { ...getHeaders(initialCookie), ...form.getHeaders() }
            });

            // Ambil cookie baru dari response (biasanya ada token/auth_cookie)
            const newCookies = searchRes.headers['set-cookie'] ? searchRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
            const sessionCookie = `${initialCookie}; ${newCookies}`;

            const $ = cheerio.load(searchRes.data);
            const title = $('h2').first().text().trim() || songName;
            const artist = $('.media-info p').first().text().split('|')[0].trim() || 'Unknown';
            const thumbnail = $('.image.is-square img').attr('src') || $('meta[property="og:image"]').attr('content');

            // 3. Generate Link (Kita ambil kualitas 256 & 320 saja agar tidak timeout di Vercel)
            const qualities = ['256', '320', 'm4a'];
            
            const fetchDownload = async (q) => {
                try {
                    const fd = new FormData();
                    fd.append('song_name', title);
                    fd.append('artist_name', artist);
                    fd.append('url', url);
                    fd.append('token', 'none');
                    fd.append('quality', q);

                    const resDown = await axios.post(`${BASE_URL}/api/composer/swd.php`, fd, {
                        headers: { ...getHeaders(sessionCookie), 'X-Requested-With': 'XMLHttpRequest', ...fd.getHeaders() }
                    });

                    if (resDown.data.status === 'success' && resDown.data.dlink) {
                        // Redirect check
                        const redirect = await axios.get(`${BASE_URL}/api/composer/ffmpeg/redirect.php`, {
                            params: { url: resDown.data.dlink },
                            headers: getHeaders(sessionCookie),
                            maxRedirects: 0,
                            validateStatus: s => s === 302 || s === 200
                        });
                        return redirect.headers.location || resDown.data.dlink;
                    }
                    return null;
                } catch { return null; }
            };

            // Jalankan paralel biar cepet
            const downloadLinks = await Promise.all(qualities.map(q => fetchDownload(q)));

            res.status(200).json({
                status: true,
                creator: "Prime Xuu",
                result: {
                    title,
                    artist,
                    thumbnail,
                    url: url,
                    downloads: {
                        "256kbps": downloadLinks[0],
                        "320kbps": downloadLinks[1],
                        "m4a": downloadLinks[2]
                    }
                }
            });

        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
};
