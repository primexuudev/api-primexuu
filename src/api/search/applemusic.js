const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scraper Logic Apple Music Search
 */
async function appleMusic(q) {
    try {
        if (!q) throw new Error("Judul nya mana?");

        const { data } = await axios.get(`https://music.apple.com/us/search?term=${encodeURIComponent(q)}`, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.9,id;q=0.8"
            },
            timeout: 30000
        });

        const $ = cheerio.load(data);
        const output = [];

        $('div[aria-label="Songs"] .track-lockup').each((_, el) => {
            const node = $(el);
            const anchor = node.find(".track-lockup__title a");
            const name = anchor.text().trim();
            const href = anchor.attr("href");
            const link = href || null;
            const artist = node
                .find(".track-lockup__subtitle a")
                .map((i, x) => $(x).text().trim())
                .get()
                .join(", ");

            const badge = node.find('[data-testid="explicit-badge"]').length > 0;
            let thumb = node.find("img").attr("src") || node.find("source").attr("srcset") || "";

            if (thumb.includes(" ")) thumb = thumb.split(" ")[0];
            if (thumb) thumb = thumb.replace(/\/\d+x\d+/, "/600x600");

            if (name) {
                output.push({
                    name,
                    artist,
                    link,
                    cover: thumb || null,
                    explicit: badge ? "yes" : "no"
                });
            }
        });

        return {
            judul: q,
            total: output.length,
            results: output
        };

    } catch (e) {
        throw new Error(e.message);
    }
}

/**
 * Export Route untuk Base API-PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/search/applemusic?q=...
    app.get('/api/search/applemusic', async (req, res) => {
        const { q } = req.query;

        if (!q) return res.json({ status: false, message: "Masukkan parameter 'q' untuk mencari lagu." });

        try {
            const result = await appleMusic(q);
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
