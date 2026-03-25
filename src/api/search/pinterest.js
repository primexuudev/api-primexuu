const axios = require('axios');

/**
 * Fitur: Pinterest Search
 * Deskripsi: Mencari gambar dari Pinterest berdasarkan query.
 */

async function pinterestSearch(query) {
  try {
    const jsonParam = JSON.stringify({
      options: { query: encodeURIComponent(query) }
    });
    
    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?data=${encodeURIComponent(jsonParam)}`;

    // Menggunakan HEAD request sesuai logika asli kamu untuk mengambil Link Header
    const res = await axios.head(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "screen-dpr": "4",
        "x-pinterest-pws-handler": "www/search/[scope].js"
      },
      timeout: 15000
    });

    const linkHeader = res.headers["link"];
    if (!linkHeader) throw new Error(`Hasil tidak ditemukan untuk "${query}"`);

    // Ambil URL dari dalam tanda kurung siku <...>
    const urls = [...linkHeader.matchAll(/<(.*?)>/gm)]
      .map(a => a[1])
      .filter(link => link.includes('i.pinimg.com')) // Pastikan hanya ambil link gambar
      .slice(0, 10);

    if (urls.length === 0) throw new Error("Tidak ada gambar yang ditemukan.");

    return {
      query: query,
      total: urls.length,
      results: urls
    };
  } catch (err) {
    throw new Error(err.message);
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/search/pinterest', async (req, res) => {
    const { query } = req.query;

    // 1. Validasi Input
    if (!query) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "query" wajib diisi! Contoh: /api/search/pinterest?query=anime+aesthetic' 
      });
    }

    try {
      // 2. Eksekusi Search
      const data = await pinterestSearch(query);

      // 3. Response (Creator otomatis ditambahkan oleh middleware index.js)
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
