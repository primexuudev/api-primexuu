const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fitur: Ephoto360 Text Effects
 * Deskripsi: Membuat efek teks estetik (Glitch, Neon, Gold, dll)
 */

const list = {
  glitchtext:          'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
  writetext:           'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
  advancedglow:        'https://en.ephoto360.com/advanced-glow-effects-74.html',
  typographytext:      'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',
  pixelglitch:         'https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html',
  neonglitch:          'https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html',
  flagtext:            'https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html',
  flag3dtext:          'https://en.ephoto360.com/free-online-american-flag-3d-text-effect-generator-725.html',
  deletingtext:        'https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html',
  blackpinkstyle:      'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html',
  glowingtext:         'https://en.ephoto360.com/create-glowing-text-effects-online-706.html',
  underwatertext:      'https://en.ephoto360.com/3d-underwater-text-effect-online-682.html',
  logomaker:           'https://en.ephoto360.com/free-bear-logo-maker-online-673.html',
  cartoonstyle:        'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html',
  papercutstyle:       'https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html',
  watercolortext:      'https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html',
  effectclouds:        'https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html',
  blackpinklogo:       'https://en.ephoto360.com/create-blackpink-logo-online-free-607.html',
  gradienttext:        'https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html',
  summerbeach:         'https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html',
  luxurygold:          'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html',
  multicoloyellowneon: 'https://en.ephoto360.com/create-multicoloyellow-neon-light-signatures-591.html',
  sandsummer:          'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html',
  galaxywallpaper:     'https://en.ephoto360.com/create-galaxy-wallpaper-mobile-online-528.html',
  '1917style':         'https://en.ephoto360.com/1917-style-text-effect-523.html',
  makingneon:          'https://en.ephoto360.com/making-neon-light-text-effect-with-galaxy-style-521.html',
  royaltext:           'https://en.ephoto360.com/royal-text-effect-online-free-471.html',
  freecreate:          'https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html',
  galaxystyle:         'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html',
  lighteffects:        'https://en.ephoto360.com/create-light-effects-green-neon-online-429.html'
};

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36';

async function Ephoto(text, type) {
  if (!list[type]) throw new Error('Type tidak ditemukan. Pilihan: ' + Object.keys(list).join(', '));

  const url = list[type];
  const { data, headers } = await axios.get(url, { headers: { 'user-agent': ua } });
  const $ = cheerio.load(data);

  const token = $('input[name=token]').val();
  const build_server = $('input[name=build_server]').val();
  const build_server_id = $('input[name=build_server_id]').val();

  const form = new URLSearchParams();
  form.append('text[]', text);
  form.append('token', token);
  form.append('build_server', build_server);
  form.append('build_server_id', build_server_id);

  const post = await axios.post(url, form, {
    headers: {
      'user-agent': ua,
      'cookie': headers['set-cookie']?.join('; ')
    }
  });

  const $$ = cheerio.load(post.data);
  const jsonVal = $$('input[name=form_value_input]').val();
  if (!jsonVal) throw new Error("Gagal memproses form efek teks.");
  
  const json = JSON.parse(jsonVal);
  json['text[]'] = json.text;
  delete json.text;

  const { data: res } = await axios.post(
    'https://en.ephoto360.com/effect/create-image',
    new URLSearchParams(json),
    {
      headers: {
        'user-agent': ua,
        'cookie': headers['set-cookie']?.join('; ')
      }
    }
  );

  return build_server + res.image;
}

/**
 * Main Handler
 */
module.exports = (app) => {
  app.get('/api/tools/ephoto', async (req, res) => {
    const { teks, type } = req.query;

    if (!teks) return res.status(400).json({ status: false, message: 'Parameter "teks" wajib diisi.' });
    if (!type) return res.status(400).json({ status: false, message: 'Parameter "type" wajib diisi.' });

    try {
      const imageUrl = await Ephoto(teks, type);
      
      res.status(200).json({ 
        status: true, 
        teks, 
        type, 
        result: imageUrl 
      });
    } catch (e) {
      res.status(500).json({ 
        status: false, 
        message: e.message 
      });
    }
  });
  
  // Endpoint tambahan untuk melihat list type yang tersedia
  app.get('/api/tools/ephoto/list', (req, res) => {
    res.json({ status: true, types: Object.keys(list) });
  });
};
