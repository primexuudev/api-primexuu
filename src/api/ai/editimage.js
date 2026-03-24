const axios = require('axios');

const TYPES = [
  'putihkan', 'hitamkan', 'edit', 'tobersama', 'toblonde', 'tobotak', 'tohijab',
  'tomekah', 'tomirror', 'tovintage', 'toanime', 'tofigura', 'tovigurav2',
  'tofigurav3', 'tobabi', 'tobrewok', 'tochibi', 'todpr', 'toghibli', 'tojepang',
  'tokacamata', 'tolego', 'tomaya', 'tomoai', 'toreal', 'tosdmtinggi', 'tosatan',
  'tosad', 'tokamboja', 'todubai', 'tomaid', 'tomangu', 'topeci', 'topiramida',
  'topolaroid', 'topunk', 'toroh', 'tostreetwear', 'totato', 'totrain', 'totua', 'toturky'
];

// Helper untuk response
const sendJSON = (res, data, status = 200) => {
  res.status(status).json(data);
};

// Download gambar sebagai buffer
async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024 // 10MB limit
  });
  return Buffer.from(response.data);
}

// Convert buffer ke base64 untuk dikirim ke API
function bufferToBase64(buffer, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Upload ke tempat lain (opsional, jika memang perlu)
// TAPI REKOMENDASI: langsung return base64 atau proxy image

module.exports = async (req, res) => {
  // Set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return sendJSON(res, { status: false, message: 'Method not allowed' }, 405);
  }

  const { url, type } = req.query;

  // Validasi input
  if (!url) {
    return sendJSON(res, { status: false, message: 'Parameter "url" wajib diisi.' }, 400);
  }
  
  if (!type) {
    return sendJSON(res, { status: false, message: 'Parameter "type" wajib diisi.' }, 400);
  }
  
  if (!TYPES.includes(type)) {
    return sendJSON(res, {
      status: false,
      message: `Type tidak valid. Pilih salah satu: ${TYPES.join(', ')}`
    }, 400);
  }

  try {
    // 1. Download gambar input
    const inputBuffer = await downloadImage(url);
    
    // 2. Upload ke imgbb atau layanan lain (opsional, jika API butuh URL)
    // REKOMENDASI: Gunakan layanan upload gratis seperti imgbb atau langsung base64
    
    // Opsi A: Kirim base64 ke API (jika API mendukung)
    const base64Image = bufferToBase64(inputBuffer);
    
    // Tentukan endpoint API
    let apiUrl;
    let requestData;
    
    if (type === 'putihkan' || type === 'hitamkan') {
      // Contoh: API yang menerima base64
      apiUrl = 'https://api-faa.my.id/faa/editfoto';
      requestData = {
        url: base64Image, // atau field yang sesuai dengan API
        prompt: `${type} warna kulit`
      };
    } else {
      apiUrl = `https://api-faa.my.id/faa/${type}`;
      requestData = { url: base64Image };
    }
    
    // 3. Panggil API edit gambar
    const resultResponse = await axios.post(apiUrl, requestData, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const resultBuffer = Buffer.from(resultResponse.data);
    
    // 4. Kembalikan gambar langsung sebagai response (REKOMENDASI)
    // Ini lebih cepat dan tidak perlu upload lagi
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="edited_${type}.jpg"`);
    return res.status(200).send(resultBuffer);
    
    /* 
    // Opsi B: Jika memang harus return URL, gunakan layanan upload sementara
    // Tapi ini akan memperlambat response dan riskan error
    const outputUrl = await uploadToTempService(resultBuffer);
    return sendJSON(res, {
      status: true,
      type: type,
      result: outputUrl
    });
    */
    
  } catch (error) {
    console.error('Edit image error:', error);
    
    // Handle error spesifik
    if (error.code === 'ECONNABORTED') {
      return sendJSON(res, { status: false, message: 'Request timeout, coba lagi nanti.' }, 504);
    }
    
    if (error.response) {
      return sendJSON(res, {
        status: false,
        message: `API error: ${error.response.status}`,
        detail: error.response.data?.toString?.() || 'Unknown error'
      }, error.response.status);
    }
    
    return sendJSON(res, {
      status: false,
      message: error.message || 'Terjadi kesalahan saat memproses gambar.'
    }, 500);
  }
};
