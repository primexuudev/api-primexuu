const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { UpGithuB } = require('../../Library/uploader');

/**
 * Fitur: Brat Gura Maker
 * Deskripsi: Membuat sticker brat dengan background Gura (WebP).
 */

const BG_URL = 'https://files.catbox.moe/trfgwb.png';

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 25000
  });
  return Buffer.from(res.data);
}

async function createBratGura(text) {
  try {
    // 1. Ambil bahan (Brat API & Background)
    const bratURL = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}`;
    const [bratBuffer, bgBuffer] = await Promise.all([
      getBuffer(bratURL),
      getBuffer(BG_URL)
    ]);

    // 2. Load ke Canvas
    const backgroundImg = await loadImage(bgBuffer);
    const inputImg = await loadImage(bratBuffer);

    const canvas = createCanvas(backgroundImg.width, backgroundImg.height);
    const ctx = canvas.getContext('2d');

    // Gambar BG
    ctx.drawImage(backgroundImg, 0, 0);

    // Logic cropping & centering (Square)
    const boxX = 395, boxY = 200, boxWidth = 310, boxHeight = 310;
    const imgAspectRatio = inputImg.width / inputImg.height;

    let sX, sY, sW, sH;
    if (imgAspectRatio > 1) {
      sH = inputImg.height;
      sW = inputImg.height;
      sX = (inputImg.width - sW) / 2;
      sY = 0;
    } else {
      sW = inputImg.width;
      sH = inputImg.width;
      sX = 0;
      sY = (inputImg.height - sH) / 2;
    }

    ctx.drawImage(inputImg, sX, sY, sW, sH, boxX, boxY, boxWidth, boxHeight);

    // 3. Convert ke WebP menggunakan Sharp (Standar Sticker)
    const pngBuffer = canvas.toBuffer('image/png');
    const webpBuffer = await sharp(pngBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();

    return webpBuffer;
  } catch (err) {
    throw new Error('Gagal memproses canvas: ' + err.message);
  }
}

/**
 * Handler Utama untuk Base API
 */
module.exports = (app) => {
  app.get('/api/maker/bratgura', async (req, res) => {
    const { teks } = req.query;

    if (!teks) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "teks" wajib diisi!' 
      });
    }

    const tmpPath = path.join('/tmp', `bratgura_${Date.now()}.webp`);

    try {
      const buffer = await createBratGura(teks);
      fs.writeFileSync(tmpPath, buffer);

      // Upload ke GitHub
      const outputUrl = await UpGithuB(tmpPath);

      res.status(200).json({
        status: true,
        result: {
          teks: teks,
          output: outputUrl
        }
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    } finally {
      // Hapus file temp agar tidak Error 500 karena storage penuh
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });
};
