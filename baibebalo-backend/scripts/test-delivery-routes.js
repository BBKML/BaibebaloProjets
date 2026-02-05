/**
 * Test des 3 routes livraison (orders/active, earnings, history)
 * Usage: node scripts/test-delivery-routes.js [BASE_URL]
 * Ex: node scripts/test-delivery-routes.js https://baibebaloprojets.onrender.com
 * Il faut d'abord un token livreur (connecté via verify-otp). Passe le token en TOKEN=xxx node scripts/...
 * Ou utilise un token existant dans .env TEST_DELIVERY_TOKEN
 */

const BASE = process.env.BASE_URL || process.argv[2] || 'http://localhost:5000';
const API = `${BASE}/api/v1`;
const token = process.env.TOKEN || process.env.TEST_DELIVERY_TOKEN;

async function test() {
  if (!token) {
    console.log('Usage: TOKEN=<jwt_livreur> node scripts/test-delivery-routes.js [BASE_URL]');
    console.log('Ou définir TEST_DELIVERY_TOKEN dans .env');
    console.log('Ex: TOKEN=eyJhbG... node scripts/test-delivery-routes.js https://baibebaloprojets.onrender.com');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const routes = [
    { name: 'GET /api/v1/delivery/orders/active', url: `${API}/delivery/orders/active` },
    { name: 'GET /api/v1/delivery/earnings', url: `${API}/delivery/earnings` },
    { name: 'GET /api/v1/delivery/history', url: `${API}/delivery/history?page=1&limit=5&status=delivered` },
  ];

  console.log('Base URL:', BASE);
  console.log('Testing 3 delivery routes with token...\n');

  for (const r of routes) {
    try {
      const t0 = Date.now();
      const res = await fetch(r.url, { headers });
      const ms = Date.now() - t0;
      const body = await res.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        data = body;
      }
      const ok = res.ok ? 'OK' : 'ERREUR';
      console.log(`${r.name} => ${res.status} ${ok} (${ms} ms)`);
      if (!res.ok) {
        console.log('  Response:', typeof data === 'object' ? JSON.stringify(data) : data);
      } else if (data?.data) {
        const keys = Object.keys(data.data);
        console.log('  data keys:', keys.join(', '));
      }
    } catch (err) {
      console.log(`${r.name} => ERREUR: ${err.message}`);
    }
    console.log('');
  }
}

test();
