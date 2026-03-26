const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Fitur: WebApp to APK Builder
 * Deskripsi: Mengubah URL Website menjadi aplikasi Android (.apk)
 */

const BASE_URL = 'https://webappcreator.amethystlab.org';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`
};

module.exports = (app) => {
    app.get('/api/tools/apkbuilder', async (req, res) => {
        const { url, name, icon } = req.query;
        let pkg = req.query.pkg; // Package name opsional

        // 1. Validasi Input
        if (!url || !name || !icon) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter "url", "name", dan "icon" (link gambar) wajib diisi!' 
            });
        }

        // Generate Package Name otomatis kalau user tidak isi
        if (!pkg) {
            const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            pkg = `com.${cleaned}.app`;
        }

        const tmpPath = path.join('/tmp', `icon_${Date.now()}.png`);

        try {
            // 2. Download Icon gambar ke /tmp
            const iconRes = await axios.get(icon, { 
                responseType: 'arraybuffer', 
                timeout: 15000 
            });
            fs.writeFileSync(tmpPath, Buffer.from(iconRes.data));

            // 3. Susun Form Data untuk Build APK
            const form = new FormData();
            form.append('websiteUrl', url);
            form.append('appName', name);
            form.append('icon', fs.createReadStream(tmpPath));
            form.append('packageName', pkg);
            form.append('versionName', '1.0.0');
            form.append('versionCode', 1);

            // 4. Eksekusi Build ke API Amethyst
            // Build APK butuh waktu lumayan lama, jadi kita pasang timeout 50 detik
            const response = await axios.post(`${BASE_URL}/api/build-apk`, form, {
                headers: {
                    ...HEADERS,
                    ...form.getHeaders()
                },
                timeout: 50000, 
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            // 5. Tangkap Error dari Provider
            if (!response.data || !response.data.success) {
                throw new Error(response.data?.message || 'Gagal mem-build APK. Provider mungkin sibuk.');
            }

            const downloadUrl = `${BASE_URL}${response.data.downloadUrl}`;

            // 6. Response Sukses
            res.status(200).json({
                status: true,
                result: {
                    app_name: name,
                    package_name: pkg,
                    website_url: url,
                    download_url: downloadUrl
                }
            });

        } catch (e) {
            // Tangani Error Timeout atau Error Axios
            const errMsg = e.response?.data?.message || e.message;
            res.status(500).json({ 
                status: false, 
                message: "Gagal membuat APK: " + errMsg 
            });
        } finally {
            // 7. WAJIB BERSIHKAN FILE ICON!
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        }
    });
};
