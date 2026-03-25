const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { UpGithuB } = require('../../Library/uploader'); // Sesuaikan path Library

/**
 * Fitur: IQC Generator
 * Deskripsi: Membuat gambar quote otomatis berdasarkan teks yang diinput.
 */

async function createIqc(teks) {
  try {
    const apiUrl = `https://api-faa.my.id/faa/iqc?prompt=${encodeURIComponent(teks)}`;
    
    // Mengambil gambar sebagai buffer
    const response = await axios.get(apiUrl, { 
      responseType: 'arraybuffer', 
      timeout: 30000 
    });

    const buffer = Buffer.from(response.data);
    const tmpPath = path.join('/tmp', `iqc_${Date.now()}.jpg`);
    
    // Simpan sementara ke folder /tmp (standar Vercel/Serverless)
    fs.writeFileSync(tmpPath, buffer);

    try {
      // Upload ke GitHub via Library kamu
      const outputUrl = await UpGithuB(tmpPath);
      return outputUrl;
    } finally {
      // Pastikan file dihapus mau upload berhasil atau gagal
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  } catch (err) {
    throw new Error('Gagal memproses gambar quote: ' + err.message);
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/maker/iqc', async (req, res) => {
    const { teks } = req.query;

    // 1. Validasi Input
    if (!teks) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "teks" wajib diisi! Contoh: /api/maker/iqc?teks=Halo+Dunia' 
      });
    }

    try {
      // 2. Eksekusi Pembuatan Quote
      const outputUrl = await createIqc(teks);

      // 3. Response Sukses (Creator otomatis dari middleware)
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
    }
  });
};
