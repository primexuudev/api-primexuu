const axios = require("axios");

/**
 * Fungsi internal untuk memproses stream dari NoteGPT menjadi teks utuh
 */
async function notegpt(message, options = {}) {
  const conversation_id =
    Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 10);

  const payload = {
    message,
    language: "auto",
    model: "gpt-4.1-mini",
    tone: "default",
    length: "moderate",
    conversation_id,
    image_urls: [],
    chat_mode: "standard",
    ...options
  };

  try {
    const res = await axios.post(
      "https://notegpt.io/api/v2/chat/stream",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        responseType: "stream"
      }
    );

    return new Promise((resolve, reject) => {
      let fullText = "";

      res.data.on("data", chunk => {
        const chunks = chunk.toString().split("\n");

        for (let line of chunks) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) fullText += parsed.text;
            // Jika statusnya 'done' atau 'finish', kita selesaikan
            if (parsed.status === "done" || parsed.done) {
               resolve({ conversation_id, text: fullText.trim() });
            }
          } catch (e) {
            // Abaikan error parsing kecil saat stream belum selesai
          }
        }
      });

      // Timeout safety: Jika stream macet lebih dari 30 detik
      setTimeout(() => {
        if (fullText) resolve({ conversation_id, text: fullText.trim() });
        else reject(new Error("Request timeout"));
      }, 30000);

      res.data.on("error", err => reject(err));
    });
  } catch (err) {
    throw new Error(err.message);
  }
}

/**
 * Handler untuk Base API
 */
module.exports = (app) => {
  app.get('/api/ai/notegpt', async (req, res) => {
    // Mendukung parameter 'q' atau 'text'
    const q = req.query.q || req.query.text;

    if (!q) {
      return res.status(400).json({ 
        status: false, 
        message: "Parameter 'q' atau 'text' wajib diisi!" 
      });
    }

    try {
      const result = await notegpt(q);

      // Response sukses
      res.status(200).json({
        status: true,
        model: "gpt-4.1-mini",
        result: result.text, // Menggunakan 'result' agar seragam dengan fitur lain
        conversation_id: result.conversation_id
      });

    } catch (err) {
      // Error handling
      res.status(500).json({ 
        status: false, 
        message: err.message 
      });
    }
  });
};
