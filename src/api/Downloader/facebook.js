const axios = require('axios');

/**
 * Fitur: Facebook Video Downloader
 * Deskripsi: Mengambil link video Facebook kualitas HD dan SD.
 */

async function facebookVideo(url) {
  try {
    const { data } = await axios.get('https://serverless-tooly-gateway-6n4h522y.ue.gateway.dev/facebook/video', {
      params: { url },
      timeout: 30000 // Antisipasi server pusat lambat
    });

    if (!data.success) throw new Error('Gagal mengambil data video dari server pusat.');

    return {
      title: data.title || "Facebook Video",
      hd: data.videos?.hd?.url || null,
      hd_size: data.videos?.hd?.size || "N/A",
      sd: data.videos?.sd?.url || null,
      sd_size: data.videos?.sd?.size || "N/A"
    };
  } catch (err) {
    throw new Error(err.message || "Terjadi kesalahan pada server downloader.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/fb', async (req, res) => {
    const { url } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Contoh: /api/downloader/fb?url=LINK_VIDEO_FB' 
      });
    }

    // Validasi sederhana format URL Facebook
    if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
      return res.status(400).json({
        status: false,
        message: 'URL tidak valid. Pastikan itu adalah link Facebook.'
      });
    }

    try {
      // 2. Eksekusi Scraper
      const result = await facebookVideo(url);

      // 3. Kirim Response (Creator otomatis ditambahkan oleh middleware index.js)
      res.status(200).json({
        status: true,
        result: result
      });

    } catch (e) {
      // Error handling yang rapi
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
