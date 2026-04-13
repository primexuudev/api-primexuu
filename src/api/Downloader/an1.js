const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scraper Logic AN1 Detail
 */
async function an1Detail(link) {
    try {
        if (!link || !link.includes("an1.com")) {
            throw new Error("Link tidak valid. Harus link dari an1.com");
        }

        const { data } = await axios.get(link, {
            headers: {
                "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "accept": "text/html,application/xhtml+xml",
                "referer": "https://an1.com/",
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const ratingId = $('[id^="ratig-layer-"]').attr("id")?.split("-")[2];

        const shots = [];
        $(".app_screens_list img").each((_, el) => {
            let src = $(el).attr("src");
            if (src) shots.push(src.replace("/thumbs/", "/"));
        });

        const downloadPath = $(".download_line.green").attr("href") || "";

        return {
            app: {
                name: $("h1[itemprop='headline']").text().trim(),
                dev: $('[itemprop="publisher"] [itemprop="name"]').text().trim(),
                icon: $("figure.img img").attr("src"),
                desc: $('[itemprop="description"]').text().trim()
            },
            info: {
                version: $('[itemprop="softwareVersion"]').text().trim(),
                size: $('[itemprop="fileSize"]').text().trim(),
                os: $('[itemprop="operatingSystem"]').text().trim(),
                updated: $('time[itemprop="datePublished"]').text().trim()
            },
            stats: {
                rating: parseFloat($(`#ratig-layer-${ratingId} .current-rating`).css("width")) / 20 || 0,
                votes: $(`#vote-num-id-${ratingId}`).text().trim()
            },
            media: shots,
            download_page: downloadPath ? "https://an1.com" + downloadPath : null
        };

    } catch (err) {
        throw new Error(err.message);
    }
}

/**
 * Export untuk Auto-Loader Base PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/downloader/an1?url=...
    app.get('/api/downloader/an1', async (req, res) => {
        const { url } = req.query;

        if (!url) return res.json({ status: false, message: "Masukkan parameter 'url'." });

        try {
            const result = await an1Detail(url);
            res.json({
                status: true,
                result: result
            });
        } catch (error) {
            res.json({
                status: false,
                message: error.message
            });
        }
    });
};
