const axios = require('axios');

/**
 * Fitur: Screenshot Website (SSWeb)
 * Deskripsi: Mengambil tangkapan layar dari sebuah URL website.
 */

async function getScreenshot(url) {
  try {
    let finalUrl = url.trim();
    // Tambahkan https:// jika user lupa mengetiknya
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    const response = await axios.get("https://api.pikwy.com/", {
      params: {
        tkn: 125,
        d: 3000, // Delay 3 detik agar halaman render sempurna
        u: finalUrl, // Axios akan otomatis encodeURIComponent
        fs: 0,
        w: 1280,
        h: 1200,
        s: 100,
        z: 100,
        f: "jpg",
        rt: "jweb"
      },
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      },
      timeout: 20000
    });

    if (!response.data || !response.data.iurl) {
      throw new Error("Gagal mengambil screenshot dari provider.");
    }

    return {
      website: finalUrl,
      screenshot: response.data.iurl
    };
  } catch (err) {
    throw new Error(err.message || "Terjadi kesalahan saat proses screenshot.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/tools/ssweb', async (req, res) => {
    const { url } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Contoh: /api/tools/ssweb?url=google.com' 
      });
    }

    try {
      // 2. Eksekusi Scraper
      const data = await getScreenshot(url);

      // 3. Response (Creator otomatis ditambahkan oleh middleware)
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
