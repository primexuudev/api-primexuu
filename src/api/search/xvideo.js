const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fitur: XVideo Search
 * Deskripsi: Mencari video berdasarkan kata kunci.
 */

async function funVideoSearch(q) {
  try {
    // Logic random page agar hasil tidak membosankan
    const page = Math.floor(3 * Math.random()) + 1;
    
    const { data } = await axios.get(`https://www.xvideos.com/?k=${encodeURIComponent(q)}&p=${page}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const results = [];

    $('div[id*="video"]').each((_, el) => {
      const title = $(el).find('.thumb-under p.title a').contents().not('span').text().trim();
      const resolution = $(el).find('.thumb-inside .thumb span').text().trim();
      const duration = $(el).find('.thumb-under p.metadata span.duration').text().trim();
      const artist = $(el).find('.thumb-under p.metadata a span.name').text().trim();
      const cover = $(el).find('.thumb-inside .thumb img').attr('data-src') || $(el).find('.thumb-inside .thumb img').attr('src');
      const path = $(el).find('.thumb-inside .thumb a').attr('href');

      if (title && path && !path.includes('googleads')) {
        results.push({
          title,
          resolution: resolution || "SD",
          duration: duration || "N/A",
          artist: artist || "Unknown",
          cover: cover || null,
          url: path.startsWith('http') ? path : 'https://www.xvideos.com' + path
        });
      }
    });

    return results;
  } catch (err) {
    throw new Error("Gagal melakukan pencarian video.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/search/xvideo', async (req, res) => {
    const query = req.query.query || req.query.q;

    // 1. Validasi Input
    if (!query) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "query" wajib diisi! Contoh: /api/search/xvideo?q=korea' 
      });
    }

    try {
      // 2. Eksekusi Scraper
      const results = await funVideoSearch(query);

      // 3. Response (Creator otomatis ditambahkan oleh middleware)
      res.status(200).json({
        status: true,
        result: {
          query: query,
          total: results.length,
          videos: results
        }
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
