const axios = require('axios');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Fitur: Nulis AI (Handwriting Generator)
 * Deskripsi: Mengubah teks menjadi gambar tulisan tangan di buku.
 */

// Registrasi Font - Pastikan file .ttf ada di folder Library
try {
  GlobalFonts.registerFromPath(path.join(__dirname, '../../Library/PatrickHand-Regular.ttf'), 'Handwrite');
} catch (e) {
  console.log("Font Handwrite tidak ditemukan, menggunakan default.");
}

// Konfigurasi GitHub Uploader (Bisa dipindah ke Library/uploader.js jika mau lebih rapi)
const GITHUB_USER = "whatsapp-media";
const GITHUB_REPO = "whatsapp-media";
const GITHUB_TOKENS = [
  "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",
  "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",
  "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",
  "ghp_w38oCyrWNWWBw4Y1sEgzmKo2EUAOwcD1GM0Zj",
  "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"
];
const BRANCH = "main";
const getRandomToken = () => GITHUB_TOKENS[Math.floor(Math.random() * GITHUB_TOKENS.length)];

async function UpGithuB(buffer) {
  const filePath = `uploads/PrimeXuu_${Date.now()}.png`;
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`;

  const res = await axios.put(url, {
    message: 'Upload via API',
    content: buffer.toString('base64'),
    branch: BRANCH
  }, {
    headers: {
      Authorization: `token ${getRandomToken()}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/${filePath}`;
}

async function generateNulis(text) {
  const imageUrl = 'https://raw.githubusercontent.com/zionjs0/whatsapp-media/main/file_1769095563962.jpg';
  const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const img = await loadImage(res.data);

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Penentuan baris otomatis berdasarkan deteksi piksel (Smart Line Detection)
  const imgData = ctx.getImageData(0, 0, img.width, img.height).data;
  const linesY = [];
  for (let y = 160; y < img.height - 120; y++) {
    let dark = 0;
    for (let x = 250; x < img.width - 200; x += 15) {
      const i = (y * img.width + x) * 4;
      const brightness = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
      if (brightness < 170) dark++;
    }
    if (dark > 12) {
      if (!linesY.length || Math.abs(linesY[linesY.length - 1] - y) > 30) {
        linesY.push(y + 18);
      }
    }
  }

  // Pengaturan Font
  ctx.font = '24px Handwrite';
  ctx.fillStyle = '#1f4fd8'; // Warna tinta biru pulpen
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.transform(1, -0.02, 0, 1, 0, 0); // Efek miring tulisan tangan

  let lineIndex = 0;
  const startX = 165;
  const maxWidth = img.width - 280;
  const paragraphs = text.split('\n');

  for (let p of paragraphs) {
    let words = p.split(' ');
    let line = '';

    for (let word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth) {
        if (linesY[lineIndex]) {
          ctx.fillText(line, startX, linesY[lineIndex]);
          lineIndex++;
        }
        line = word + ' ';
      } else {
        line = test;
      }
    }
    if (linesY[lineIndex]) {
      ctx.fillText(line, startX, linesY[lineIndex]);
      lineIndex++;
    }
  }

  ctx.restore();
  return canvas.toBuffer('image/png');
}

/**
 * Handler Utama
 */
module.exports = (app) => {
  app.get('/api/tools/nulis', async (req, res) => {
    const teks = req.query.teks || req.query.text;

    if (!teks) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "teks" wajib diisi!' 
      });
    }

    try {
      const buffer = await generateNulis(teks);
      const outputUrl = await UpGithuB(buffer);

      res.status(200).json({
        status: true,
        result: outputUrl
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
