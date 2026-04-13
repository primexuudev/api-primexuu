const axios = require("axios");

/**
 * Scraper Logic TikTok Stalk
 */
async function tiktokStalk(username) {
    try {
        if (!username) throw new Error("Username required");

        // Bersihkan username dari karakter @ jika user memasukkannya
        const user = username.replace('@', '');

        const { data: html } = await axios.get(`https://www.tiktok.com/@${user}`, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "accept-language": "en-US,en;q=0.9"
            }
        });

        const raw = html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/
        );

        if (!raw) throw new Error("Gagal parsing data. TikTok mungkin memblokir request atau struktur berubah.");

        const json = JSON.parse(raw[1]);
        const scope = json?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;

        if (!scope) throw new Error("User tidak ditemukan.");

        const u = scope.user;
        const s = scope.stats;

        return {
            profile: {
                username: u.uniqueId,
                nickname: u.nickname,
                userId: u.id,
                secUid: u.secUid,
                url: `https://www.tiktok.com/@${u.uniqueId}`,
                bio: u.signature,
                language: u.language,
                verified: u.verified,
                privateAccount: u.privateAccount,
                avatar: {
                    large: u.avatarLarger,
                    medium: u.avatarMedium,
                    thumb: u.avatarThumb
                }
            },
            stats: {
                followers: s.followerCount,
                following: s.followingCount,
                likes: s.heartCount,
                videos: s.videoCount
            }
        };
    } catch (err) {
        throw new Error(err.message);
    }
}

/**
 * Export Route untuk Auto-Loader Base PrimeXuu
 */
module.exports = (app) => {
    // Endpoint: /api/search/ttstalk?username=...
    app.get('/api/search/ttstalk', async (req, res) => {
        const { username } = req.query;

        if (!username) return res.json({ status: false, message: "Masukkan parameter 'username'." });

        try {
            const result = await tiktokStalk(username);
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
