const axios = require('axios');

/**
 * Fungsi internal untuk mencari lirik via LRCLIB
 */
async function searchLyrics(title) {
  const keyword = String(title).trim();
  if (!keyword) throw new Error('Judul lagu wajib diisi');

  const { data } = await axios.get(
    `https://lrclib.net/api/search?q=${encodeURIComponent(keyword)}`,
    {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'referer': `https://lrclib.net/search/${encodeURIComponent(keyword)}`,
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      },
      timeout: 60000
    }
  );

  if (!data || !Array.isArray(data)) throw new Error('Format respon tidak valid dari server lirik');

  return data.map(v => ({
    id: v?.id ?? null,
    track: v?.trackName ?? null,
    artist: v?.artistName ?? null,
    album: v?.albumName ?? null,
    duration: v?.duration ?? null,
    instrumental: v?.instrumental ?? false,
    lyrics: v?.plainLyrics ?? "Lirik tidak tersedia"
  }));
}

/**
 * Handler yang diekspor ke Express app (Base API)
 */
module.exports = (app) => {
  app.get('/api/search/lyrics', async (req, res) => {
    // Di base API kamu, parameter 'key' tidak wajib lagi 
    // karena kita sudah hilangkan sistem key tadi.
    const { judul } = req.query;

    if (!judul) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter judul wajib diisi! Contoh: /api/search/lyrics?judul=komang' 
      });
    }

    try {
      const result = await searchLyrics(judul);

      // Jika data kosong
      if (result.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'Lirik lagu tidak ditemukan.'
        });
      }

      // Berhasil
      res.status(200).json({
        status: true,
        result: result // Menggunakan 'result' agar seragam dengan fitur lainnya
      });

    } catch (e) {
      // Error handling
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
