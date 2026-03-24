const axios = require('axios');
const FormData = require('form-data');

/**
 * Fitur: Nano Banana (AI Image Magic Eraser)
 * Deskripsi: Menghapus objek atau mengedit gambar berdasarkan prompt.
 */

// Fungsi untuk generate serial random
function genserial() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// Fungsi untuk membuat job editing di server pusat
async function createJob(imageUrl, prompt) {
  const form = new FormData();
  form.append('model_name', 'magiceraser_v4');
  form.append('original_image_url', imageUrl);
  form.append('prompt', prompt);
  form.append('ratio', 'match_input_image');
  form.append('output_format', 'jpg');

  const res = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job', form, {
    headers: {
      ...form.getHeaders(),
      'product-code': 'magiceraser',
      'product-serial': genserial(),
      'origin': 'https://imgupscaler.ai',
      'referer': 'https://imgupscaler.ai/'
    }
  });
  
  if (!res.data.result || !res.data.result.job_id) {
    throw new Error("Gagal membuat antrean job AI.");
  }
  return res.data.result.job_id;
}

// Fungsi untuk mengecek status job (apakah sudah selesai atau masih diproses)
async function cekjob(jobId) {
  const res = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
    headers: { 
      'origin': 'https://imgupscaler.ai', 
      'referer': 'https://imgupscaler.ai/' 
    }
  });
  return res.data;
}

/**
 * Handler yang diekspor untuk Base API
 */
module.exports = (app) => {
  app.get('/api/tools/nanobanana', async (req, res) => {
    const { url, prompt } = req.query;

    // 1. Validasi Input
    if (!url) return res.status(400).json({ status: false, message: 'Parameter "url" wajib diisi.' });
    if (!prompt) return res.status(400).json({ status: false, message: 'Parameter "prompt" wajib diisi.' });

    try {
      // 2. Buat Job
      const jobId = await createJob(url, prompt);

      // 3. Polling (Cek berkala sampai selesai)
      let result;
      let attempts = 0;
      const maxAttempts = 20; // Maksimal tunggu 60 detik (20 x 3 detik)

      do {
        await new Promise(r => setTimeout(r, 3000)); // Tunggu 3 detik tiap pengecekan
        result = await cekjob(jobId);
        attempts++;

        // Jika sudah terlalu lama, hentikan agar tidak terkena timeout Vercel
        if (attempts >= maxAttempts) break;
      } while (result.code === 300006); // 300006 biasanya kode untuk "Processing"

      if (result.code !== 200 && result.code !== 0) {
        throw new Error(result.message || "Proses AI gagal.");
      }

      // 4. Kirim Response Sukses
      res.status(200).json({
        status: true,
        job_id: jobId,
        prompt: prompt,
        result: result.result.output_url[0] // Menggunakan 'result' agar seragam
      });

    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message 
      });
    }
  });
};
