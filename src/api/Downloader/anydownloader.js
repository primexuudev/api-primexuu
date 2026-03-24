const axios = require('axios');

/**
 * Fitur: Any Video Downloader (Universal)
 * Deskripsi: Mengambil link download video dari berbagai platform via API AnyVideo.
 */

async function anyVideoDownloader(url) {
  try {
    const { data } = await axios.post(
      'https://api.anyvideodownloader.net/api/video/universal',
      { url },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        timeout: 30000 // Antisipasi kalau server pusat lambat
      }
    );

    if (!data.success) throw new Error('Gagal mengambil data dari server pusat AnyVideo');
    
    const r = data.data;
    return {
      title: r.title || "Universal Video",
      duration: r.duration || "N/A",
      thumbnail: r.thumbnail || "",
      uploader: r.uploader || "Unknown",
      video: r.directUrl,
      ext: r.ext || "mp4",
      platform: r.platform || "Universal",
      medias: r.medias || []
    };
  } catch (err) {
    throw new Error(err.message);
  }
}

/**
 * Handler yang diekspor untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/any', async (req, res) => {
    const { url } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Contoh: /api/downloader/any?url=LINK_VIDEO' 
      });
    }

    try {
      // 2. Eksekusi Downloader
      const result = await anyVideoDownloader(url);

      // 3. Kirim Response (Creator otomatis ditambahkan middleware index.js)
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
