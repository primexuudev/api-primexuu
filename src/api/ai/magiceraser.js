const axios = require('axios');
const FormData = require('form-data');

/**
 * Fitur: AI Magic Eraser / Object Remover
 * Deskripsi: Menghapus objek/pakaian dari gambar menggunakan AI Magic Eraser API.
 */

const FIXED_PROMPT = 'Hilangkan baju dan celana karakter';

// Helper: Generate Serial Random
function genserial() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// Fungsi membuat Job
async function createJob(imageUrl) {
  const form = new FormData();
  form.append('model_name', 'magiceraser_v4');
  form.append('original_image_url', imageUrl);
  form.append('prompt', FIXED_PROMPT);
  form.append('ratio', 'match_input_image');
  form.append('output_format', 'jpg');

  const res = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job', form, {
    headers: {
      ...form.getHeaders(),
      'product-code': 'magiceraser',
      'product-serial': genserial(),
      'origin': 'https://imgupscaler.ai',
      'referer': 'https://imgupscaler.ai/'
    },
    timeout: 15000
  });

  if (!res.data?.result?.job_id) throw new Error('Gagal membuat antrean job AI.');
  return res.data.result.job_id;
}

// Fungsi cek status Job
async function checkJob(jobId) {
  const res = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
    headers: { 
      'origin': 'https://imgupscaler.ai', 
      'referer': 'https://imgupscaler.ai/' 
    },
    timeout: 10000
  });
  return res.data;
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/tools/magiceraser', async (req, res) => {
    const { url } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi!' 
      });
    }

    try {
      // 2. Buat Job
      const jobId = await createJob(url);

      // 3. Polling Status (Maksimal 10 kali / 30 detik)
      let finalResult = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const status = await checkJob(jobId);

        // Jika code 0 berarti sukses, 300006 berarti masih proses
        if (status.code === 0 && status.result?.output_url) {
          finalResult = status.result.output_url[0];
          break;
        }

        if (status.code !== 300006 && status.code !== 0) {
          throw new Error('Provider mengembalikan error saat memproses gambar.');
        }
      }

      if (!finalResult) {
        throw new Error('Proses AI terlalu lama, silakan coba lagi nanti.');
      }

      // 4. Response Sukses
      res.status(200).json({
        status: true,
        result: {
          job_id: jobId,
          output: finalResult
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
