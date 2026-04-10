const axios = require("axios");
const crypto = require("crypto");

class NanoBanana {
    constructor() {
        this.baseURL = "https://aibanana.net";
        this.siteKey = "0x4AAAAAAB2-fh9F_EBQqG2_";
        this.solverURL = "https://cf-solver-renofc.my.id/api/solvebeta";
    }

    async solveTurnstile() {
        try {
            const response = await axios.post(this.solverURL, {
                url: this.baseURL,
                siteKey: this.siteKey,
                mode: "turnstile-min"
            }, { timeout: 30000 }); // Beri waktu lebih karena solver butuh waktu
            return response.data.token.result.token;
        } catch (e) {
            throw new Error("Gagal bypass Turnstile: " + e.message);
        }
    }

    generateContext() {
        const osList = ["Windows NT 10.0; Win64; x64", "Macintosh; Intel Mac OS X 10_15_7", "X11; Linux x86_64"];
        const resolutions = [{ w: 1920, h: 1080 }, { w: 1366, h: 768 }, { w: 1440, h: 900 }];
        const platforms = ["Windows", "macOS", "Linux"];
        const languages = ["en-US,en;q=0.9", "id-ID,id;q=0.9,en-US;q=0.8"];

        return {
            fingerprint: crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"),
            deviceId: crypto.randomBytes(8).toString("hex"),
            userAgent: `Mozilla/5.0 (${osList[Math.floor(Math.random() * osList.length)]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 20) + 110}.0.0.0 Safari/537.36`,
            viewport: resolutions[Math.floor(Math.random() * resolutions.length)],
            platform: platforms[Math.floor(Math.random() * platforms.length)],
            language: languages[Math.floor(Math.random() * languages.length)],
            chromeVer: Math.floor(Math.random() * 10) + 120
        };
    }

    async generate(prompt) {
        const ctx = this.generateContext();
        const token = await this.solveTurnstile();

        const response = await axios.post(`${this.baseURL}/api/image-generation`, {
            prompt: prompt,
            model: "nano-banana-2",
            mode: "text-to-image",
            numImages: 1,
            aspectRatio: "1:1",
            clientFingerprint: ctx.fingerprint,
            turnstileToken: token,
            deviceId: ctx.deviceId
        }, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Accept-Language": ctx.language,
                "Origin": this.baseURL,
                "Referer": `${this.baseURL}/`,
                "User-Agent": ctx.userAgent,
                "Sec-Ch-Ua": `"Chromium";v="${ctx.chromeVer}", "Not-A.Brand";v="24", "Google Chrome";v="${ctx.chromeVer}"`,
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": `"${ctx.platform}"`,
                "Viewport-Width": ctx.viewport.w.toString(),
                "Viewport-Height": ctx.viewport.h.toString(),
                "X-Forwarded-For": Array.from({length: 4}, () => Math.floor(Math.random() * 255)).join('.')
            }
        });

        return response.data;
    }
}

const banana = new NanoBanana();

module.exports = (app) => {
    // Endpoint: /api/ai/nanobanana?prompt=...
    app.get('/api/ai/nanobanana', async (req, res) => {
        const { prompt } = req.query;

        if (!prompt) return res.json({ status: false, message: "Masukkan parameter 'prompt'." });

        try {
            const result = await banana.generate(prompt);
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
