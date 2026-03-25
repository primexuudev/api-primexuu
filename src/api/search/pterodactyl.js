const crypto = require('crypto');
const axios = require('axios'); // Menggunakan axios agar seragam dengan library lain di base kamu

/**
 * Fitur: Pterodactyl Server Creator
 * Deskripsi: Otomasi pembuatan User dan Server di Panel Pterodactyl.
 */

const paketMap = {
  '1gb':       [1024,  1024,  100],
  '2gb':       [2048,  2048,  150],
  '3gb':       [3072,  3072,  200],
  '4gb':       [4096,  4096,  250],
  '5gb':       [5120,  5120,  300],
  '6gb':       [6144,  6144,  350],
  '7gb':       [7168,  7168,  400],
  '8gb':       [8192,  8192,  450],
  'unlimited': [0,      0,      0]
};

async function CreatePtero(paket, username, ptla, domain, egg = 15, loc = 1) {
  if (!paketMap[paket]) throw new Error('Paket tidak valid. Pilihan: 1gb-8gb, unlimited');

  const [ram, disk, cpu] = paketMap[paket];
  const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = `${cleanUser}${crypto.randomBytes(2).toString('hex')}@primexuu.biz.id`;
  const password = crypto.randomBytes(4).toString('hex');
  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ptla}`
  };

  try {
    // 1. Create User
    const userRes = await axios.post(`${cleanDomain}/api/application/users`, {
      email,
      username: cleanUser,
      first_name: cleanUser,
      last_name: 'User',
      password
    }, { headers });

    const user = userRes.data.attributes;

    // 2. Create Server
    const serverRes = await axios.post(`${cleanDomain}/api/application/servers`, {
      name: `${cleanUser} Server`,
      user: user.id,
      egg: parseInt(egg),
      docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
      startup: 'npm start',
      environment: { INST_PATH: '/', USER_UPLOAD: '0', AUTO_UPDATE: '0' },
      limits: { memory: ram, swap: 0, disk, io: 500, cpu },
      feature_limits: { databases: 1, backups: 1, allocations: 1 },
      deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
    }, { headers });

    return {
      user_id: user.id,
      server_id: serverRes.data.attributes.id,
      username: cleanUser,
      password: password,
      email: email,
      resources: {
        ram: ram === 0 ? 'Unlimited' : `${ram}MB`,
        cpu: cpu === 0 ? 'Unlimited' : `${cpu}%`,
        disk: disk === 0 ? 'Unlimited' : `${disk}MB`
      },
      panel_url: cleanDomain
    };
  } catch (err) {
    const errorMsg = err.response?.data?.errors?.[0]?.detail || err.message;
    throw new Error(`Pterodactyl Error: ${errorMsg}`);
  }
}

/**
 * Handler Utama
 */
module.exports = (app) => {
  app.get('/api/tools/pterodactyl', async (req, res) => {
    const { user, domain, ptla, ram, egg, loc } = req.query;

    if (!user || !domain || !ptla) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "user", "domain", dan "ptla" (API Key Panel) wajib diisi!'
      });
    }

    try {
      const result = await CreatePtero(
        (ram || '1gb').toLowerCase(),
        user,
        ptla,
        domain,
        egg || 15,
        loc || 1
      );

      res.status(200).json({
        status: true,
        result: result
      });

    } catch (e) {
      res.status(500).json({
        status: false,
        message: e.message
      });
    }
  });
};
