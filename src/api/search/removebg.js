const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Fitur: Remove Background (EzRemove)
 * Deskripsi: Menghapus background gambar menggunakan AI EzRemove.
 */

const BASE_URL = "https://api.ezremove.ai/api";
const SERIAL = "db068b9b7a108ae1c9945d10dac53dca";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    "origin": "https://ezremove.ai",
    "referer": "https://ezremove.ai/",
    "accept": "*/*"
};

// Helper Polling Job
async function pollJob(url, extraHeaders = {}) {
    const start = Date.now();
    const timeout = 60000; // 60 detik limit polling

    while (Date.now() - start < timeout) {
        const res = await axios.get(url, {
            headers: { ...HEADERS, ...extraHeaders }
        });

        const result = res.data?.result ?? res.data;
        if (result?.status === 2) return result;
        if (result?.status === 3 || (typeof result?.status === 'number' && result?.status < 0)) {
            throw new Error(result?.error || 'Proses AI gagal di provider.');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error("Timeout: Proses penghapusan background terlalu lama.");
}

async function removeBg(imageUrl) {
    const tmpPath = path.join('/tmp', `rbg_${Date.now()}.jpg`);
    
    try {
        // 1. Download image ke buffer lalu simpan ke /tmp
        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(tmpPath, Buffer.from(imageRes.data));

        // 2. NSFW Check (Wajib oleh API EzRemove)
        const nsfwForm = new FormData();
        nsfwForm.append('images', fs.createReadStream(tmpPath));
        const nsfwCreate = await axios.post(`${BASE_URL}/common/utils/nsfw-detect-create`, nsfwForm, {
            headers: { ...HEADERS, ...nsfwForm.getHeaders() }
        });
        const nsfwId = nsfwCreate.data?.result?.job_id;
        if (nsfwId) await pollJob(`${BASE_URL}/common/utils/nsfw-detect-job/${nsfwId}`);

        // 3. Create Remove BG Job
        const bgForm = new FormData();
        bgForm.append('image_file', fs.createReadStream(tmpPath));
        bgForm.append('mode', 'general_v2');
        bgForm.append('task_mode', 'free');

        const bgCreate = await axios.post(`${BASE_URL}/ez-remove/v3/background-remove/create-job`, bgForm, {
            headers: { 
                ...HEADERS, 
                ...bgForm.getHeaders(),
                "product-serial": SERIAL 
            }
        });

        if (bgCreate.data.code !== 100000) throw new Error("Gagal membuat antrean RemoveBG.");

        // 4. Polling Hasil Akhir
        const finalResult = await pollJob(
            `${BASE_URL}/ez-remove/v3/background-remove/get-job/${bgCreate.data.result.job_id}`,
            { "product-serial": SERIAL }
        );

        const outputUrl = finalResult.image_url || finalResult.result_url || finalResult.output?.url;
        if (!outputUrl) throw new Error("Gagal mendapatkan URL hasil.");

        return outputUrl;

    } catch (err) {
        throw err;
    } finally {
        // Hapus file temp
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
}

/**
 * Handler Utama
 */
module.exports = (app) => {
    app.get('/api/tools/removebg', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ status: false, message: 'Parameter "url" gambar wajib diisi.' });
        }

        try {
            const result = await removeBg(url);
            res.status(200).json({
                status: true,
                result: {
                    output: result
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, message: e.message });
        }
    });
};
