const axios = require('axios');
const fs = require('fs');
const path = require('path');
// Memanggil uploader GitHub dari Library base kamu
const { UpGithuB } = require('../../Library/uploader'); 

const TYPES = [
  'putihkan','hitamkan','edit','tobersama','toblonde','tobotak','tohijab',
  'tomekah','tomirror','tovintage','toanime','tofigura','tovigurav2',
  'tofigurav3','tobabi','tobrewok','tochibi','todpr','toghibli','tojepang',
  'tokacamata','tolego','tomaya','tomoai','toreal','tosdmtinggi','tosatan',
  'tosad','tokamboja','todubai','tmaid','tomangu','topeci','topiramida',
  'topolaroid','topunk','toroh','tostreetwear','totato','totrain','totua','toturky'
];

/**
 * Helper: Download Gambar ke Buffer
 */
async function downloadImage(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

/**
 * Helper: Upload Buffer ke GitHub (via Library)
 */
async function bufferToGithubUrl(buffer, ext = 'jpg') {
  const tmpPath = path.join('/tmp', `editimg_${Date.now()}.${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  try {
    const url = await UpGithuB(tmpPath);
    return url;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

/**
 * Handler Utama untuk Base API
 */
module.exports = (app) => {
  app.get('/api/tools/editimage', async (req, res) => {
    const { url, type } = req.query;

    // 1. Validasi Input
    if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" wajib diisi.' });
    if (!type) return res.status(400).json({ status: false, message: 'Parameter "type" wajib diisi.' });
    
    if (!TYPES.includes(type)) {
      return res.status(400).json({ 
        status: false, 
        message: `Type tidak valid. Pilih salah satu: ${TYPES.join(', ')}` 
      });
    }

    try {
      // 2. Download & Upload ke GitHub (Pihak ketiga butuh URL publik)
      const inputBuffer = await downloadImage(url);
      const inputUrl = await bufferToGithubUrl(inputBuffer, 'jpg');

      // 3. Panggil API AI Pihak Ketiga
      let apiUrl;
      if (type === 'putihkan' || type === 'hitamkan') {
        apiUrl = `https://api-faa.my.id/faa/editfoto?url=${encodeURIComponent(inputUrl)}&prompt=${type}%20warna%20kulit`;
      } else {
        apiUrl = `https://api-faa.my.id/faa/${type}?url=${encodeURIComponent(inputUrl)}`;
      }

      // 4. Ambil Hasil Edit & Upload Ulang agar Link Permanen
      const resultRes = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const resultBuffer = Buffer.from(resultRes.data);
      const outputUrl = await bufferToGithubUrl(resultBuffer, 'jpg');

      // 5. Response Sukses
      res.status(200).json({
        status: true,
        type: type,
        result: outputUrl
      });

    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message || 'Terjadi kesalahan saat mengedit gambar.' 
      });
    }
  });
};
