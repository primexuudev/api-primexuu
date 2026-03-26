const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fitur: Kompas News Scraper
 * Deskripsi: Mengambil berita terbaru, trending, dan populer dari Kompas.com
 */

const BASE_URL = 'https://news.kompas.com';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

module.exports = (app) => {
    app.get('/api/search/kompas', async (req, res) => {
        try {
            const response = await axios.get(BASE_URL, { headers: HEADERS, timeout: 10000 });
            const $ = cheerio.load(response.data);
            
            // 1. Trending Topics
            const trendingTopics = [];
            $('.trendItem').each((i, el) => {
                const title = $(el).find('.trendTitle a').text().trim();
                const link = $(el).find('.trendTitle a').attr('href');
                if (title) trendingTopics.push({ title, link });
            });

            // 2. Main News (Headline)
            const mainNews = [];
            $('.articleHL-big .swiper-slide').each((i, el) => {
                const title = $(el).find('.articleTitle').text().trim();
                const link = $(el).find('a').attr('href');
                const image = $(el).find('.articleHL-img img').attr('data-src') || $(el).find('.articleHL-img img').attr('src');
                if (title) mainNews.push({ title, link, image });
            });

            // 3. Latest News
            const latestNews = [];
            $('.articleList .articleItem').each((i, el) => {
                const title = $(el).find('.articleTitle').text().trim();
                const link = $(el).find('a').attr('href');
                const image = $(el).find('.articleItem-img img').attr('data-src') || $(el).find('.articleItem-img img').attr('src');
                const category = $(el).find('.articlePost-subtitle').text().trim();
                if (title) latestNews.push({ title, link, image, category });
            });

            // 4. Popular News
            const popularNews = [];
            $('.mostList .mostItem').each((i, el) => {
                const rank = $(el).find('.mostItem-count').text().trim();
                const title = $(el).find('.mostItem-title').text().trim();
                const link = $(el).find('a').attr('href');
                if (title) popularNews.push({ rank, title, link });
            });

            res.status(200).json({
                status: true,
                creator: "Prime Xuu",
                result: {
                    trending: trendingTopics,
                    headline: mainNews,
                    latest: latestNews,
                    popular: popularNews
                }
            });

        } catch (e) {
            res.status(500).json({ 
                status: false, 
                message: "Gagal mengambil berita: " + e.message 
            });
        }
    });
};
