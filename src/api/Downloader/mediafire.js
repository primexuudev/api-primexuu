const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fitur: MediaFire Downloader
 * Deskripsi: Bypass link MediaFire untuk mendapatkan direct link download.
 */

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Upgrade-Insecure-Requests': '1'
};

async function mediafireDl(url) {
    try {
        const response = await axios.get(url, { 
            headers: HEADERS,
            timeout: 15000 // Limit 15 detik
        });
        
        const $ = cheerio.load(response.data);
        
        // Target utama: Link Download
        const downloadUrl = $('#downloadButton').attr('href');
        
        if (!downloadUrl) {
            // Cek apakah ada indikasi file dipassword atau butuh login
            const isPasswordProtected = $('input[type="password"]').length > 0;
            if (isPasswordProtected) throw new Error('File ini diproteksi oleh password.');
            
            throw new Error('Link download tidak ditemukan. Mungkin file sudah dihapus atau URL tidak valid.');
        }
        
        // Ekstraksi Metadata
        const fileName = $('.dl-btn-label').attr('title') || 
                         $('.promoDownloadName .dl-btn-label').text().trim() || 
                         url.split('/').pop();
        
        const rawSize = $('.download_link .input').text() || $('.download_link a').text() || '';
        const sizeMatch = rawSize.match(/\(([^)]+)\)/);
        const fileSize = sizeMatch ? sizeMatch[1] : 'Unknown';
        
        const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'Unknown';
        const uploadDate = $('.upload_date, .upload-date').text().trim() || 'Unknown';

        return {
            title: fileName,
            size: fileSize,
            extension: fileExtension,
            upload_date: uploadDate,
            url: url,
            download_url: downloadUrl
        };

    } catch (err) {
        throw new Error(err.message || 'Gagal mengekstrak data dari MediaFire.');
    }
}

/**
 * Handler Utama
 */
module.exports = (app) => {
    app.get('/api/downloader/mediafire', async (req, res) => {
        const { url } = req.query;

        // 1. Validasi Input
        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter "url" wajib diisi! Contoh: /api/downloader/mediafire?url=LINK_MF' 
            });
        }

        // Cek apakah benar link MediaFire
        if (!url.includes('mediafire.com')) {
            return res.status(400).json({
                status: false,
                message: 'URL tidak valid. Pastikan itu adalah link MediaFire.'
            });
        }

        try {
            // 2. Eksekusi Downloader
            const data = await mediafireDl(url);

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
