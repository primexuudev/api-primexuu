const axios = require('axios');

/**
 * Fitur: Info Cuaca (Weather API)
 * Deskripsi: Cek cuaca berdasarkan nama kota (Global Support)
 */

async function scrapeCuaca(kota) {
  let suhu = '-', angin = '-', arah = '-', waktu = '-', lokasi = kota;
  
  try {
    // 1. Ambil Koordinat (Geocoding) via Open-Meteo
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(kota)}&count=1`, { timeout: 10000 });
    
    if (geo.data.results && geo.data.results.length > 0) {
      const { latitude: lat, longitude: lon, name: nama, country: negara } = geo.data.results[0];
      
      // 2. Ambil Cuaca via Open-Meteo
      const cuaca = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, { timeout: 10000 });
      
      if (cuaca.data.current_weather) {
        const w = cuaca.data.current_weather;
        suhu = `${w.temperature}°C`;
        angin = `${w.windspeed} km/h`;
        arah = `${w.winddirection}°`;
        waktu = w.time;
        lokasi = `${nama}, ${negara}`;
      }
    } else {
      throw new Error('Geo data not found');
    }
  } catch (err) {
    // FALLBACK: Gunakan wttr.in jika Open-Meteo gagal
    try {
      const alt = await axios.get(`https://wttr.in/${encodeURIComponent(kota)}?format=j1`, { timeout: 15000 });
      const c = alt.data.current_condition[0];
      const area = alt.data.nearest_area[0];
      
      suhu = `${c.temp_C}°C`;
      angin = `${c.windspeedKmph} km/h`;
      arah = c.winddir16Point;
      waktu = 'Realtime';
      lokasi = `${area.areaName[0].value}, ${area.country[0].value}`;
    } catch (e) {
      throw new Error("Gagal mengambil data cuaca dari semua provider.");
    }
  }

  const warning = parseFloat(angin) > 40 ? '⚠️ Angin sangat kencang berpotensi badai' : 'Kondisi angin normal';
  
  return { 
    lokasi, 
    suhu, 
    angin, 
    arah, 
    waktu, 
    status: warning 
  };
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/tools/cuaca', async (req, res) => {
    const { kota } = req.query;

    if (!kota) {
      return res.status(400).json({ 
        status: false, 
        message: 'Parameter "kota" wajib diisi! Contoh: /api/tools/cuaca?kota=jakarta' 
      });
    }

    try {
      const result = await scrapeCuaca(kota);

      // Response sukses (creator otomatis dari middleware)
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
