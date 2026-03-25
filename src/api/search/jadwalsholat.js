const axios = require('axios');

/**
 * Fitur: Jadwal Sholat
 * Deskripsi: Mengambil jadwal sholat harian berdasarkan nama kota (Default Indonesia).
 */

async function getJadwal(kota) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const today = `${day}-${month}-${year}`;

  try {
    const url = `https://api.aladhan.com/v1/timingsByCity/${today}?city=${encodeURIComponent(kota)}&country=Indonesia&method=11`;
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data.code !== 200) throw new Error('Kota tidak ditemukan atau API sedang bermasalah.');

    const { timings, date } = data.data;

    return {
      kota: kota.charAt(0).toUpperCase() + kota.slice(1),
      tanggal: date.readable,
      hijri: `${date.hijri.date} ${date.hijri.month.en} ${date.hijri.year}`,
      jadwal: {
        Imsak: timings.Imsak,
        Subuh: timings.Fajr,
        Terbit: timings.Sunrise,
        Dzuhur: timings.Dhuhr,
        Ashar: timings.Asr,
        Maghrib: timings.Maghrib,
        Isya: timings.Isha
      }
    };
  } catch (err) {
    throw new Error(err.message || "Gagal mengambil jadwal sholat.");
  }
}

/**
 * Handler Utama untuk Base API (index.js)
 */
module.exports = (app) => {
  app.get('/api/tools/jadwalsholat', async (req, res) => {
    // Mendukung parameter 'kota' atau 'city'
    const kota = req.query.kota || req.query.city;

    if (!kota) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "kota" wajib diisi! Contoh: /api/tools/jadwalsholat?kota=jakarta'
      });
    }

    try {
      const data = await getJadwal(kota);

      // Response sukses (creator otomatis ditambahkan oleh middleware index.js)
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
