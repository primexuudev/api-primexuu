const axios = require('axios');
const { fetch } = require('undici');

/**
 * Fitur: Brat Generator (Image & GIF)
 * Deskripsi: Membuat sticker brat atau gif brat ala WhatsApp.
 */

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

// Helper: Upload langsung ke GitHub CDN
async function uploadToGithub(buffer, forceExt) {
  const ext = forceExt || 'png';
  const fileName = `Brat_${Date.now()}.${ext}`;
  const filePath = `uploads/${fileName}`;
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${getRandomToken()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PrimeXuu-API'
      },
      body: JSON.stringify({
        message: `Upload Brat ${fileName}`,
        content: buffer.toString('base64'),
        branch: BRANCH
      })
    });

    const json = await res.json();
    if (!json.content) throw new Error('GitHub Upload Failed');

    return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/${filePath}`;
  } catch (err) {
    throw new Error('Gagal upload ke CDN: ' + err.message);
  }
}

async function getBratMedia(text, isVideo = false) {
  const animated = isVideo ? 'true' : 'false';
  const url = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${animated}&delay=500`;
  
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  return Buffer.from(res.data);
}

/**
 * Handler Utama untuk Base API
 */
module.exports = (app) => {
  app.get('/api/maker/brat', async (req, res) => {
    const teks = req.query.text || req.query.teks;
    const type = req.query.type || 'image'; // image atau video

    // 1. Validasi Input
    if (!teks) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "teks" wajib diisi!' 
      });
    }

    if (teks.length > 250) {
      return res.status(400).json({ status: false, message: 'Teks terlalu panjang (Max 250).' });
    }

    try {
      // 2. Generate Brat
      const isVideo = type === 'video';
      const buffer = await getBratMedia(teks, isVideo);

      // 3. Upload ke GitHub CDN
      const ext = isVideo ? 'gif' : 'png';
      const outputUrl = await uploadToGithub(buffer, ext);

      // 4. Response
      res.status(200).json({
        status: true,
        result: {
          text: teks,
          type: type,
          output: outputUrl
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
