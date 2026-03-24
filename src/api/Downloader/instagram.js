const axios = require('axios');

// Fungsi helper untuk hit API internal vdraw
async function igInfo(url) {
  const { data } = await axios.post(
    'https://vdraw.ai/api/v1/instagram/ins-info',
    { url, type: 'video' },
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://vdraw.ai',
        'Referer': 'https://vdraw.ai/'
      }
    }
  );
  return data;
}

module.exports = (app) => {
  // Route: /api/download/ig
  app.get('/api/download/ig', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: 'Masukkan parameter url!' 
      });
    }

    try {
      const result = await igInfo(url);
      
      // Karena index.js kamu sudah punya middleware otomatis untuk "creator" & "status",
      // kita cukup kirim datanya saja.
      res.status(200).json({
        status: true,
        result: result
      });
    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.response?.data || e.message 
      });
    }
  });
};
