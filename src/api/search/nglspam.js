const crypto = require('crypto');
const axios = require('axios');

/**
 * Fitur: NGL Link Spammer
 * Deskripsi: Mengirim pesan anonim ke NGL.link secara massal (Max 20).
 */

async function NglSpam(username, message, count = 1) {
  let sent = 0;
  const maxAttempts = count * 2; // Limit usaha agar tidak looping selamanya
  let attempts = 0;

  while (sent < count && attempts < maxAttempts) {
    attempts++;
    try {
      const deviceId = crypto.randomBytes(21).toString('hex');

      const body = new URLSearchParams({
        username: username,
        question: message,
        deviceId: deviceId,
        gameSlug: '',
        referrer: ''
      });

      const res = await axios.post('https://ngl.link/api/submit', body.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://ngl.link',
          'Referer': `https://ngl.link/${username}`
        },
        timeout: 10000
      });

      if (res.status === 200) {
        sent++;
        // Jeda 1 detik antar pesan agar lebih aman
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      // Jika kena rate limit (429), tunggu lebih lama
      if (e.response?.status === 429) {
        await new Promise(r => setTimeout(r, 5000));
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return {
    username,
    message,
    total_sent: sent,
    status: sent > 0 ? "Success" : "Failed"
  };
}

/**
 * Handler Utama
 */
module.exports = (app) => {
  app.get('/api/tools/nglspam', async (req, res) => {
    const { username, message, count } = req.query;

    // 1. Validasi Input
    if (!username || !message) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "username" dan "message" wajib diisi!' 
      });
    }

    const spamCount = parseInt(count || '1');
    if (isNaN(spamCount) || spamCount < 1) {
      return res.status(400).json({ status: false, message: 'Count harus berupa angka minimal 1.' });
    }

    // Limit biar server gak bengkak bebannya (Limit 20 sesuai code asli)
    if (spamCount > 20) {
      return res.status(400).json({ status: false, message: 'Maksimal count adalah 20 pesan per request.' });
    }

    try {
      // 2. Eksekusi Spam
      const result = await NglSpam(username, message, spamCount);

      // 3. Response (Creator otomatis dari middleware)
      res.status(200).json({
        status: true,
        result: result
      });

    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
};
