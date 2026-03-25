const crypto = require("crypto");
const axios = require("axios");

/**
 * Fitur: YouTube Downloader
 * Deskripsi: Download Video (MP4) atau Audio (MP3) dari YouTube via SaveTube.
 */

class SaveTube {
  constructor() {
    this.ky = "C5D58EF67A7584E4A29F6C35BBC4EB12";
    this.fmt = ["144", "240", "360", "480", "720", "1080", "mp3"];
    this.m = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/;

    this.is = axios.create({
      headers: {
        "content-type": "application/json",
        "origin": "https://yt.savetube.me",
        "user-agent": "Mozilla/5.0 (Android 15; Mobile) Gecko/130.0 Firefox/130.0"
      },
      timeout: 20000 // Timeout 20 detik
    });
  }

  async decrypt(enc) {
    const sr = Buffer.from(enc, "base64");
    const ky = Buffer.from(this.ky, "hex");
    const iv = sr.slice(0, 16);
    const dt = sr.slice(16);
    const dc = crypto.createDecipheriv("aes-128-cbc", ky, iv);
    const res = Buffer.concat([dc.update(dt), dc.final()]);
    return JSON.parse(res.toString());
  }

  async getCdn() {
    const response = await this.is.get("https://media.savetube.vip/api/random-cdn");
    if (!response.data) return { status: false };
    return {
      status: true,
      data: response.data.cdn
    };
  }

  async download(url, format = "mp3") {
    const id = url.match(this.m)?.[3];
    if (!id) {
      return { status: false, msg: "URL YouTube tidak valid." };
    }

    if (!this.fmt.includes(format)) {
      return { status: false, msg: `Format tidak didukung. Pilihan: ${this.fmt.join(", ")}` };
    }

    try {
      const cdn = await this.getCdn();
      if (!cdn.status) throw new Error("Gagal mendapatkan server CDN.");

      const info = await this.is.post(`https://${cdn.data}/v2/info`, {
        url: `https://www.youtube.com/watch?v=${id}`
      });

      const dec = await this.decrypt(info.data.data);

      const dl = await this.is.post(`https://${cdn.data}/download`, {
        id,
        downloadType: format === "mp3" ? "audio" : "video",
        quality: format === "mp3" ? "128" : format,
        key: dec.key
      });

      return {
        status: true,
        title: dec.title,
        format,
        thumb: dec.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        duration: dec.duration,
        cached: dec.fromCache,
        download: dl.data.data.downloadUrl
      };
    } catch (e) {
      throw new Error(e.message || "Gagal memproses video dari server tujuan.");
    }
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/downloader/ytdl', async (req, res) => {
    const url = req.query.url;
    const format = (req.query.format || "mp3").toLowerCase();

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi! Contoh: /api/downloader/ytdl?url=LINK_YT&format=mp3"
      });
    }

    try {
      // 2. Eksekusi Downloader
      const yt = new SaveTube();
      const data = await yt.download(url, format);

      if (!data.status) {
        return res.status(400).json({
          status: false,
          message: data.msg
        });
      }

      // 3. Response Sukses
      res.status(200).json({
        status: true,
        result: {
          title: data.title,
          format: data.format,
          duration: data.duration,
          thumbnail: data.thumb,
          download_url: data.download
        }
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      });
    }
  });
};
