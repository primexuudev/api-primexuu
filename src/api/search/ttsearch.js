const axios = require('axios');

/**
 * Fitur: TikTok Search Video
 * Deskripsi: Mencari video TikTok berdasarkan kata kunci (No Watermark).
 */

async function tiktokSearchVideo(query) {
  try {
    const res = await axios('https://tikwm.com/api/feed/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'cookie': 'current_language=en',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
      },
      data: new URLSearchParams({ 
        keywords: query, 
        count: 12, 
        cursor: 0, 
        web: 1, 
        hd: 1 
      }).toString(),
      timeout: 15000
    });

    if (!res.data || !res.data.data) {
      throw new Error("Video tidak ditemukan atau API sedang limit.");
    }

    // Mapping data agar lebih rapi untuk konsumsi API/Bot
    const videos = res.data.data.videos.map(v => ({
      title: v.title,
      author: v.author.nickname,
      views: v.play_count,
      likes: v.digg_count,
      video: `https://tikwm.com${v.play}`, // Video no watermark
      music: v.music,
      cover: `https://tikwm.com${v.cover}`
    }));

    return {
      query: query,
      total: videos.length,
      videos: videos
    };
  } catch (err) {
    throw new Error(err.message || "Gagal mengambil data dari TikTok.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/search/ttsearch', async (req, res) => {
    const { query } = req.query;

    // 1. Validasi Input
    if (!query) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "query" wajib diisi! Contoh: /api/search/ttsearch?query=jedag+jedug' 
      });
    }

    try {
      // 2. Eksekusi Pencarian
      const result = await tiktokSearchVideo(query);

      // 3. Response (Creator otomatis ditambahkan oleh middleware)
      res.status(200).json({
        status: true,
        result: result
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
