const crypto = require('crypto');

const SECRET_KEY_HEX = '792525efde6d921d6055a5d62dcebd39c8b5364e99fa87c5adf0e89391266d9c';
const HOST = 'fastdl.app';
const CONSTANTS = { _ts: 1773148641059, _tsc: 0, _sv: 2 };

function signData(data) {
    const ts = Date.now();
    const key = Buffer.from(SECRET_KEY_HEX, 'hex');
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data + String(ts));
    return { ts, _s: hmac.digest('hex') };
}

async function fastdl(input) {
    const isUrl = input.startsWith('https://');
    const endpoint = isUrl
        ? `https://api-wh.${HOST}/api/convert`
        : `https://api-wh.${HOST}/api/v1/instagram/userInfo`;

    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Origin': `https://${HOST}`,
        'Referer': `https://${HOST}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (isUrl) {
        const { ts, _s } = signData(input);
        const params = new URLSearchParams({
            sf_url: input,
            ts: String(ts),
            _ts: String(CONSTANTS._ts),
            _tsc: String(CONSTANTS._tsc),
            _sv: String(CONSTANTS._sv),
            _s: _s,
        });

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: params.toString()
        });
        return await res.json();
    } else {
        const payload = { username: input };
        const { ts, _s } = signData(JSON.stringify(payload));
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ts, _ts: CONSTANTS._ts, _tsc: CONSTANTS._tsc, _sv: CONSTANTS._sv, _s })
        });
        return await res.json();
    }
}

module.exports = (app) => {
    app.get('/api/downloader/igdl', async (req, res) => {
        const { url } = req.query;

        if (!url) return res.json({ status: false, message: "Masukkan parameter url" });

        try {
            const result = await fastdl(url);
            
            // Di base kamu, res.json sudah di-override untuk nambahin 'creator' otomatis
            res.json({
                status: true,
                result: result
            });
        } catch (e) {
            res.json({
                status: false,
                message: "Error: " + e.message
            });
        }
    });
};
