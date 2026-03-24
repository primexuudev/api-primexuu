const axios = require('axios');
const fs = require('fs');
const path = require('path');
// Pastikan file uploader.js ada di folder Library kamu
const { UpGithuB } = require('../../Library/uploader'); 

const TYPES = [
  'putihkan','hitamkan','edit','tobersama','toblonde','tobotak','tohijab',
  'tomekah','tomirror','tovintage','toanime','tofigura','tovigurav2',
  'tofigurav3','tobabi','tobrewok','tochibi','todpr','toghibli','tojepang',
  'tokacamata','tolego','tomaya','tomoai','toreal','tosdmtinggi','tosatan',
  'tosad','tokamboja','todubai','tomaid','tomangu','topeci','topiramida',
  'topolaroid','topunk','toroh','tostreetwear','totato','totrain','totua','toturky'
];

async function downloadImage(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

async function bufferToGithubUrl(buffer, ext = 'jpg') {
  // Gunakan folder tmp untuk Vercel
  const tmpPath = path.join('/tmp', `editimg_${Date.now()}.${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  try {
    const url = await UpGithuB(tmpPath);
    return url;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

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
      // 2. Proses Download & Upload ke GitHub (sebagai database sementara)
      const inputBuffer = await downloadImage(url);
      const inputUrl = await bufferToGithubUrl(inputBuffer, 'jpg');

      // 3. Tentukan Endpoint API Pihak Ketiga
      let apiUrl;
      if (type === 'putihkan' || type === 'hitamkan') {
        apiUrl = `https://api-faa.my.id/faa/editfoto?url=${encodeURIComponent(inputUrl)}&prompt=${type}%20warna%20kulit`;
      } else {
        apiUrl = `https://api-faa.my.id/faa/${type}?url=${encodeURIComponent(inputUrl)}`;
      }

      // 4. Ambil Hasil Edit (berupa gambar) dan Upload ulang agar dapat link permanen
      const resultRes = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const resultBuffer = Buffer.from(resultRes.data);
      const outputUrl = await bufferToGithubUrl(resultBuffer, 'jpg');

      // 5. Kirim Response
      res.status(200).json({
        status: true,
        type: type,
        result: outputUrl
      });

    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message || 'Terjadi kesalahan saat memproses gambar.' 
      });
    }
  });
};
