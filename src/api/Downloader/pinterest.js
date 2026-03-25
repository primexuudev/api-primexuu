const axios = require('axios');

/**
 * Fitur: Pinterest Downloader
 * Deskripsi: Mengambil link download video/gambar dari URL Pinterest.
 */

async function pinterestDownloader(url) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'process_pinterest_url');
    params.append('url', url);
    params.append('nonce', '89bdd9a2af'); // Nonce dari provider

    const res = await axios.post(
      'https://pintdownloader.com/wp-admin/admin-ajax.php',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://pintdownloader.com/'
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.success) {
      throw new Error('Gagal mendapatkan data dari provider. Pastikan URL valid.');
    }

    // Mengembalikan data mentah atau bisa kamu filter sesuai kebutuhan UI
    return res.data;
  } catch (err) {
    throw new Error(err.message || 'Terjadi kesalahan pada server downloader.');
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/pinterest', async (req, res) => {
    const { url } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Contoh: /api/downloader/pinterest?url=LINK_PINTEREST' 
      });
    }

    // Proteksi URL sederhana
    if (!url.includes('pinterest.com') && !url.includes('pin.it')) {
      return res.status(400).json({
        status: false,
        message: 'URL tidak valid. Pastikan itu adalah link Pinterest atau pin.it'
      });
    }

    try {
      // 2. Eksekusi Scraper
      const data = await pinterestDownloader(url);

      // 3. Kirim Response (Creator otomatis ditambahkan oleh middleware)
      res.status(200).json({
        status: true,
        result: data
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
