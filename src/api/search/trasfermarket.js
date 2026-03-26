const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fitur: Transfermarkt Scraper
 * Deskripsi: Mencari data profil dan statistik pemain sepak bola.
 */

const BASE_URL = 'https://www.transfermarkt.co.id';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function getPlayerInfo(query) {
    try {
        // 1. Eksekusi Pencarian
        const searchUrl = `${BASE_URL}/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`;
        const { data: searchData } = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(searchData);

        const firstRow = $('#player-grid tbody tr').first();
        if (!firstRow.length) {
            throw new Error(`Pemain dengan nama "${query}" tidak ditemukan.`);
        }

        const name = firstRow.find('.hauptlink a').first().text().trim();
        const detailPath = firstRow.find('.hauptlink a').first().attr('href');
        const id = detailPath?.match(/spieler\/(\d+)/)?.[1];

        if (!detailPath || !id) {
            throw new Error('Gagal mengekstrak ID atau Link pemain.');
        }

        const detailUrlFull = detailPath.startsWith('http') ? detailPath : BASE_URL + detailPath;

        const searchResult = {
            id,
            name,
            position: firstRow.find('td.zentriert').first().text().trim() || 'N/A',
            age: firstRow.find('td.zentriert').eq(1).text().trim() || 'N/A',
            club: firstRow.find('.tiny_wappen').first().attr('title') || 'N/A',
            nationality: firstRow.find('.flaggenrahmen').first().attr('title') || 'N/A',
            marketValue: firstRow.find('.rechts.hauptlink').first().text().trim() || 'N/A',
            image: firstRow.find('.bilderrahmen-fixed').attr('src') || null,
            detailUrl: detailUrlFull
        };

        // 2. Scraping Detail Profil Pemain
        const { data: detailData } = await axios.get(detailUrlFull, { headers: HEADERS, timeout: 15000 });
        const $$ = cheerio.load(detailData);

        const info = {};
        let currentLabel = '';
        $$('.info-table .info-table__content').each((i, el) => {
            const text = $$(el).text().trim().replace(/\s+/g, ' ');
            if (i % 2 === 0) {
                currentLabel = text;
            } else if (currentLabel) {
                info[currentLabel] = text;
            }
        });

        const stats = [];
        $$('.responsive-table table tbody tr').each((i, el) => {
            const cols = $$(el).find('td');
            if (cols.length >= 4) {
                const competition = $$(cols[0]).text().trim().replace(/\s+/g, ' ');
                const apps = $$(cols[1]).text().trim();
                const goals = $$(cols[2]).text().trim();
                const assists = $$(cols[3]).text().trim();
                if (competition && competition !== '' && !competition.includes('Total')) {
                    stats.push({ competition, apps, goals, assists });
                }
            }
        });

        const marketValueText = $$('.data-header__market-value-wrapper').first().text().trim().replace(/\s+/g, ' ');
        const marketValue = marketValueText.split('Update')[0].trim();

        const detailResult = {
            id,
            name: $$('h1').first().text().trim().replace(/\s+/g, ' ').replace(/#\d+/, '').trim(), // Hapus nomor punggung dari judul
            image: $$('.data-header__profile-image').attr('src') || null,
            club: $$('.data-header__club a').first().text().trim() || 'N/A',
            clubLogo: $$('.data-header__box--big img').first().attr('src') || $$('.data-header__box--big img').first().attr('data-src') || null,
            fullName: info['Nama lengkap:'] || 'N/A',
            age: info['Tanggal lahir / Umur:'] || 'N/A',
            birthplace: info['Tempat kelahiran:']?.replace(/[^\w\s,]/g, '').trim() || 'N/A',
            height: info['Tinggi:'] || 'N/A',
            nationality: info['Kewarganegaraan:']?.replace(/\s+/g, ' ').trim() || 'N/A',
            position: info['Posisi:'] || 'N/A',
            foot: info['Kaki dominan:'] || 'N/A',
            agent: info['Agen pemain:']?.replace(/\s+/g, ' ').trim() || 'N/A',
            joined: info['Bergabung:'] || 'N/A',
            contract: info['Kontrak berakhir:'] || 'N/A',
            marketValue: marketValue || searchResult.marketValue,
            stats
        };

        return {
            search: searchResult,
            detail: detailResult
        };

    } catch (err) {
        throw new Error(err.message || 'Gagal mengekstrak data dari Transfermarkt.');
    }
}

/**
 * Handler Utama
 */
module.exports = (app) => {
    app.get('/api/search/transfermarkt', async (req, res) => {
        const query = req.query.q || req.query.query;

        // 1. Validasi Input
        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter "q" wajib diisi! Contoh: /api/search/transfermarkt?q=Messi' 
            });
        }

        try {
            // 2. Eksekusi Scraper
            const data = await getPlayerInfo(query);

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

