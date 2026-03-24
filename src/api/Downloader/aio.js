const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fitur: All-In-One Downloader (AIO)
 * Support: TikTok, YouTube, Instagram, Facebook (Fallback).
 */

// Helper: Deteksi Platform
function detectPlatform(url) {
  if (url.includes("tiktok")) return "tiktok";
  if (url.includes("youtube") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram")) return "instagram";
  if (url.includes("facebook") || url.includes("fb.watch")) return "facebook";
  return "unknown";
}

// Scraper: TikTok
async function scrapeTikTok(url) {
  const { data } = await axios.get("https://www.tikwm.com/api/", { params: { url, hd: 1 } });
  if (!data?.data) throw new Error("Gagal mengambil data TikTok");
  const d = data.data;
  return [{
    title: d.title || "TikTok Video",
    thumbnail: d.cover,
    duration: d.duration,
    download_url: d.play,
    hd_url: d.hdplay || d.play,
    author: d.author,
    platform: "tiktok"
  }];
}

// Scraper: YouTube
async function scrapeYouTube(url) {
  const { data } = await axios.get("https://co.wuk.sh/api/json", {
    params: { url, isAudioOnly: false, isNoTTWatermark: true }
  });
  if (!data?.url) throw new Error("Gagal mengambil data YouTube");
  return [{
    title: data.meta?.title || "YouTube Video",
    thumbnail: data.meta?.thumb,
    download_url: data.url,
    quality: data.selectedFormat?.quality || "HD",
    platform: "youtube"
  }];
}

// Scraper: Instagram
async function scrapeInstagram(url) {
  const { data } = await axios.get("https://igram.io/api/ig", { params: { url } });
  if (!data?.data) throw new Error("Gagal mengambil data Instagram");
  const d = data.data;
  const results = [];
  if (d.video_versions?.length) {
    results.push({
      title: d.caption?.text || "Instagram Video",
      thumbnail: d.image_versions2?.candidates?.[0]?.url,
      download_url: d.video_versions[0].url,
      platform: "instagram"
    });
  }
  return results;
}

// Scraper: Fallback (on4t)
async function scrapeOn4t(url) {
  const initialUrl = "https://on4t.com/online-video-downloader";
  const initial = await axios.get(initialUrl);
  const $ = cheerio.load(initial.data);
  const token = $('meta[name="csrf-token"]').attr("content");
  if (!token) throw new Error("CSRF token tidak ditemukan");

  const postData = new URLSearchParams();
  postData.append("_token", token);
  postData.append("link[]", url);

  const { data } = await axios.post("https://on4t.com/all-video-download", postData.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (!data?.result?.length) throw new Error("Link download tidak ditemukan");
  return data.result.map(item => ({
    title: item.title || "Download Results",
    thumbnail: item.image || item.videoimg_file_url,
    download_url: item.video_file_url || item.videoimg_file_url,
    quality: item.quality || "HD",
    platform: "auto"
  }));
}

/**
 * Main Handler untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/aio', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi!"
      });
    }

    try {
      const platform = detectPlatform(url);
      let results;

      if (platform === "tiktok") {
        results = await scrapeTikTok(url);
      } else if (platform === "youtube") {
        results = await scrapeYouTube(url);
      } else if (platform === "instagram") {
        results = await scrapeInstagram(url);
      } else {
        results = await scrapeOn4t(url);
      }

      // Response sukses
      res.status(200).json({
        status: true,
        platform,
        result: results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  });
};
