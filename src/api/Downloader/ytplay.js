const yts = require("yt-search");
const axios = require("axios");

/**
 * Fungsi untuk mencari video di YouTube 
 * lalu mengambil link download MP3 dari API pihak ketiga.
 */
async function ytPlay(query) {
  try {
    if (!query) throw new Error("Query tidak boleh kosong");

    // 1. Cari video berdasarkan kata kunci
    const search = await yts(query);
    if (!search.videos || !search.videos.length) {
      throw new Error("Video tidak ditemukan");
    }

    const video = search.videos[0];
    const videoUrl = video.url;

    // 2. Request ke API eksternal untuk mendapatkan link MP3
    const apiUrl = `https://kyzoyamada-api-rsh.vercel.app/api/ytdl?url=${encodeURIComponent(videoUrl)}&format=mp3`;
    const { data } = await axios.get(apiUrl);

    if (!data.status) {
      throw new Error("Gagal mendapatkan link download dari server pusat");
    }

    // 3. Kembalikan data rapi
    return {
      status: true,
      title: data.title || video.title,
      duration: data.duration || video.duration.timestamp,
      thumb: data.thumb || video.thumbnail,
      download: data.download,
      source: videoUrl
    };

  } catch (err) {
    return {
      status: false,
      error: err.message
    };
  }
}

/**
 * Handler yang akan dibaca otomatis oleh index.js kamu
 */
module.exports = (app) => {
  app.get('/api/ytplay', async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ 
        status: false, 
        message: 'Masukkan parameter query! Contoh: /api/ytplay?query=rewrite+the+stars' 
      });
    }

    const result = await ytPlay(query);

    if (!result.status) {
      return res.status(400).json(result);
    }

    // Response sukses (creator otomatis ditambahkan oleh middleware di index.js)
    res.status(200).json(result);
  });
};
