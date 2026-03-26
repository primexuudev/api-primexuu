const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Fitur: Catbox Uploader
 * Deskripsi: Mengupload file dari URL (Gambar/Video/Audio) ke CDN Catbox.moe
 */

module.exports = (app) => {
    app.get('/api/tools/catbox', async (req, res) => {
        const { url } = req.query;

        // 1. Validasi Input
        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter "url" wajib diisi! Pastikan URL mengarah langsung ke media.' 
            });
        }

        // Ambil nama file dari URL, atau beri nama default jika tidak terbaca
        let fileName = url.split('/').pop().split('?')[0];
        if (!fileName || !fileName.includes('.')) {
            fileName = `catbox_${Date.now()}.png`; 
        }

        // Tentukan path ke folder sementara Vercel
        const tmpPath = path.join('/tmp', fileName);

        try {
            // 2. Download file dari URL sumber ke buffer
            const fileResponse = await axios.get(url, { 
                responseType: 'arraybuffer', 
                timeout: 15000 // Timeout 15 detik biar aman
            });

            // 3. Simpan ke /tmp
            fs.writeFileSync(tmpPath, Buffer.from(fileResponse.data));

            // 4. Siapkan FormData untuk Catbox
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            // Jika punya userhash Catbox, bisa ditambahkan di sini. Kalau tidak, hapus saja.
            // form.append('userhash', 'ISI_HASH_KAMU_JIKA_ADA');
            form.append('fileToUpload', fs.createReadStream(tmpPath));

            // 5. Upload ke Catbox
            const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
                },
                timeout: 20000 // Beri waktu 20 detik untuk upload
            });

            // Catbox merespon langsung dengan teks URL (bukan JSON)
            const catboxUrl = uploadRes.data;

            if (!catboxUrl.startsWith('http')) {
                throw new Error('Gagal upload ke Catbox. Respon: ' + catboxUrl);
            }

            // 6. Response Sukses
            res.status(200).json({
                status: true,
                result: {
                    original_url: url,
                    catbox_url: catboxUrl
                }
            });

        } catch (e) {
            res.status(500).json({ 
                status: false, 
                message: "Gagal memproses file: " + e.message 
            });
        } finally {
            // 7. BERSIHKAN FILE! (Wajib agar Vercel tidak Error 500 karena storage penuh)
            if (fs.existsSync(tmpPath)) {
                fs.unlinkSync(tmpPath);
            }
        }
    });
};
