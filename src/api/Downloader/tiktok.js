const axios = require('axios');

/**
 * Fitur: TikTok Downloader
 * Deskripsi: Download video (No WM/HD) dan slide foto TikTok.
 */

// Helper: Format angka (contoh: 1000 jadi 1.000)
const formatNumber = (num) => {
  return Number(num).toLocaleString('id-ID');
};

// Helper: Format tanggal
const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

async function tiktokDl(url) {
  try {
    const domain = "https://www.tikwm.com/api/";
    const res = await axios.post(domain, {}, {
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36'
      },
      params: {
        url: url,
        web: 1,
        hd: 1
      },
      timeout: 15000
    });

    const data = res.data.data;
    if (!data) throw new Error("Video tidak ditemukan atau link tidak valid.");

    let mediaData = [];
    // Jika formatnya slide foto
    if (data.duration === 0 && data.images) {
      data.images.forEach(img => {
        mediaData.push({ type: "photo", url: img });
      });
    } else {
      // Jika formatnya video
      mediaData.push(
        { type: "watermark", url: "https://www.tikwm.com" + data.wmplay },
        { type: "nowatermark", url: "https://www.tikwm.com" + data.play },
        { type: "nowatermark_hd", url: "https://www.tikwm.com" + data.hdplay }
      );
    }

    return {
      title: data.title,
      region: data.region,
      duration: data.duration + " Seconds",
      taken_at: formatDate(data.create_time),
      stats: {
        views: formatNumber(data.play_count),
        likes: formatNumber(data.digg_count),
        comments: formatNumber(data.comment_count),
        share: formatNumber(data.share_count)
      },
      author: {
        username: data.author.unique_id,
        nickname: data.author.nickname,
        avatar: "https://www.tikwm.com" + data.author.avatar
      },
      music: "https://www.tikwm.com" + (data.music || data.music_info.play),
      media: mediaData
    };
  } catch (err) {
    throw new Error(err.message || "Gagal mengambil data TikTok.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/tiktok', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Contoh: /api/downloader/tiktok?url=LINK_TIKTOK' 
      });
    }

    try {
      const data = await tiktokDl(url);

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
