const axios = require('axios');
const FormData = require('form-data');

/**
 * Fitur: AI Text to Image & Video
 * Deskripsi: Generate media menggunakan AI Labs API.
 */

const aiLabs = {
  api: {
    base: 'https://text2video.aritek.app',
    endpoints: {
      text2img: '/text2img',
      generate: '/txt2videov3',
      video: '/video'
    }
  },

  headers: {
    'user-agent': 'NB Android/1.0.0',
    'accept-encoding': 'gzip',
    'content-type': 'application/json'
  },

  state: { token: null },

  setup: {
    cipher: 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW',
    shiftValue: 3,

    dec(text, shift) {
      return [...text].map(c =>
        /[a-z]/.test(c)
          ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97)
          : /[A-Z]/.test(c)
          ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65)
          : c
      ).join('');
    },

    async decrypt() {
      if (aiLabs.state.token) return aiLabs.state.token;
      const token = aiLabs.setup.dec(aiLabs.setup.cipher, aiLabs.setup.shiftValue);
      aiLabs.state.token = token;
      return token;
    }
  },

  deviceId() {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  },

  async text2img(prompt) {
    const token = await aiLabs.setup.decrypt();
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('token', token);

    const res = await axios.post(
      aiLabs.api.base + aiLabs.api.endpoints.text2img,
      form,
      { 
        headers: { 
          ...aiLabs.headers, 
          ...form.getHeaders(),
          'authorization': token 
        },
        timeout: 20000 
      }
    );

    if (res.data?.code !== 0 || !res.data?.url) {
      throw new Error('Gagal generate image. Provider mungkin sedang sibuk.');
    }

    return {
      type: 'image',
      url: res.data.url.trim(),
      prompt
    };
  },

  async generateVideo(prompt) {
    const token = await aiLabs.setup.decrypt();

    const payload = {
      deviceID: aiLabs.deviceId(),
      isPremium: 1,
      prompt,
      used: [],
      versionCode: 59
    };

    const gen = await axios.post(
      aiLabs.api.base + aiLabs.api.endpoints.generate,
      payload,
      { 
        headers: { ...aiLabs.headers, 'authorization': token },
        timeout: 15000
      }
    );

    const key = gen.data?.key;
    if (!key) throw new Error('Gagal mendapatkan antrean video. Coba prompt lain.');

    return await aiLabs.getVideo(key, token);
  },

  async getVideo(key, token) {
    const payload = { keys: [key] };

    // Limit polling maksimal 20 kali (sekitar 40 detik) agar tidak timeout Vercel
    for (let i = 0; i < 20; i++) {
      const res = await axios.post(
        aiLabs.api.base + aiLabs.api.endpoints.video,
        payload,
        { headers: { ...aiLabs.headers, 'authorization': token }, timeout: 10000 }
      );

      const data = res.data?.datas?.[0];
      if (data?.url) {
        return {
          type: 'video',
          url: data.url.trim(),
          key
        };
      }

      // Tunggu 2 detik sebelum cek lagi
      await new Promise(r => setTimeout(r, 2000));
    }

    throw new Error('Proses video terlalu lama. Silakan coba beberapa saat lagi.');
  }
};

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/ai/txt2', async (req, res) => {
    const { prompt, type } = req.query;
    const mediaType = type === 'image' ? 'image' : 'video';

    // 1. Validasi Input
    if (!prompt) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "prompt" wajib diisi!' 
      });
    }

    try {
      // 2. Eksekusi AI
      const data = mediaType === 'image' 
        ? await aiLabs.text2img(prompt) 
        : await aiLabs.generateVideo(prompt);

      // 3. Response Sukses
      res.status(200).json({
        status: true,
        result: data
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
