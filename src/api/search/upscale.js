const axios = require('axios');

/**
 * Fitur: AI Image Upscaler (Picsart)
 * Deskripsi: Memperjelas/HD gambar menggunakan AI model dari Picsart.
 */

const AI_URL = 'https://ai.picsart.com';
const JS_URL = 'https://picsart.com/-/landings/4.310.0/static/index-C3-HwnoW-GZgP7cLS.js';
const HEADERS = {
  'origin': 'https://picsart.com',
  'referer': 'https://picsart.com/',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'accept': '*/*'
};

// Cache token di memory agar tidak perlu scrape JS terus-menerus
let cachedToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  try {
    const res = await axios.get(JS_URL, { headers: HEADERS, timeout: 15000 });
    // Regex untuk mengambil Bearer token dari file minified JS
    const match = res.data.match(/"x-app-authorization":"Bearer\s+([^"]+)"/);
    if (!match?.[1]) throw new Error('Token authorization tidak ditemukan.');
    
    cachedToken = match[1];
    return cachedToken;
  } catch (err) {
    throw new Error('Gagal mengambil token Picsart: ' + err.message);
  }
}

async function enhance(imageUrl, scale = 4) {
  const token = await getToken();

  const body = {
    image_url: imageUrl,
    colour_correction: { enabled: false, blending: 0.5 },
    seed: 42,
    upscale: { enabled: true, node: 'esrgan', target_scale: scale },
    face_enhancement: { enabled: true, blending: 1, max_faces: 1000, impression: false, gfpgan: true, node: 'ada' }
  };

  try {
    const res = await axios.post(`${AI_URL}/gw1/diffbir-enhancement-service/v1.7.6`, body, {
      params: {
        picsart_cdn_url: imageUrl,
        format: 'PNG',
        model: 'REALESERGAN'
      },
      headers: {
        ...HEADERS,
        'accept': 'application/json',
        'content-type': 'application/json',
        'platform': 'website',
        'x-app-authorization': `Bearer ${token}`,
        'x-touchpoint': 'widget_EnhancedImage',
        'x-touchpoint-referrer': '/id/ai-image-enhancer/'
      },
      timeout: 30000 // Upscale AI butuh waktu agak lama
    });

    return res.data;
  } catch (err) {
    // Jika token expired (401), reset cache agar request berikutnya mengambil token baru
    if (err.response && err.response.status === 401) {
      cachedToken = null;
      throw new Error('Token API expired. Silakan coba request ulang.');
    }
    throw new Error(err.response?.data?.message || err.message || 'Gagal memproses gambar di server AI.');
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/tools/upscale', async (req, res) => {
    const { url, scale } = req.query;

    // 1. Validasi Input
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "url" wajib diisi! Pastikan URL mengarah langsung ke gambar.' 
      });
    }

    const targetScale = parseInt(scale || '4');
    if (isNaN(targetScale) || targetScale < 2 || targetScale > 8) {
      return res.status(400).json({ status: false, message: 'Scale harus angka antara 2 hingga 8.' });
    }

    try {
      // 2. Eksekusi Upscale
      const result = await enhance(url, targetScale);

      // Cari output URL dari response Picsart yang bentuk JSON-nya suka berubah-ubah
      const outputUrl = result?.result?.image_url || result?.data?.output_url || result?.output_url;
      
      if (!outputUrl) {
        throw new Error('Gagal mendapatkan link hasil upscale dari provider.');
      }

      // 3. Response Sukses
      res.status(200).json({
        status: true,
        result: {
          original: url,
          scale: `${targetScale}x`,
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
