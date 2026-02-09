/**
 * BAIBEBALO API - Tests de charge (load testing)
 *
 * Scénarios :
 * 1. 100 clients simultanés s'inscrivent (send-otp)
 * 2. 50 commandes créées en même temps
 * 3. 1000 requêtes GPS/minute (livreurs)
 * 4. 500 notifications push simultanées (broadcast)
 * 5. 100 restaurants mettent à jour le menu
 *
 * Métriques : temps de réponse (< 200 ms idéal), débit (req/s), taux d'erreur (< 1%),
 * utilisation CPU/RAM (processus runner), connexions DB (via rapport).
 *
 * Prérequis :
 *   npm install --save-dev autocannon
 *   Le serveur API doit tourner (ex: npm start sur le port cible).
 *
 * Usage :
 *   node tests/performance/load.test.js
 *   PERF_BASE_URL=http://localhost:5001 node tests/performance/load.test.js
 *   RESTAURANT_TOKEN=xxx DELIVERY_TOKEN=xxx node tests/performance/load.test.js
 *
 * Variables d'environnement optionnelles :
 *   PERF_BASE_URL     - URL de base (défaut: http://localhost:5001)
 *   RESTAURANT_TOKEN  - Token JWT restaurant (scénarios 5)
 *   DELIVERY_TOKEN    - Token JWT livreur (scénario 3)
 *   CLIENT_TOKEN      - Token JWT client (scénario 2)
 *   ADMIN_TOKEN       - Token JWT admin (scénario 4)
 *   PERF_DURATION     - Durée en secondes par scénario (défaut: 10)
 *   PERF_SKIP_AUTH    - Si "1", ignore les scénarios nécessitant des tokens
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_PREFIX = '/api/v1';
const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:5001';
const DURATION = parseInt(process.env.PERF_DURATION || '10', 10);
const SKIP_AUTH = process.env.PERF_SKIP_AUTH === '1';

const RESTAURANT_TOKEN = process.env.RESTAURANT_TOKEN || '';
const DELIVERY_TOKEN = process.env.DELIVERY_TOKEN || '';
const CLIENT_TOKEN = process.env.CLIENT_TOKEN || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const TARGET_LATENCY_MS = 200;
const TARGET_ERROR_RATE_PCT = 1;

const reportLines = [];
function log(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  reportLines.push(line);
  console.log(line);
}

function formatNumber(n) {
  if (n === undefined || n === null) return '-';
  return typeof n === 'number' ? n.toFixed(2) : String(n);
}

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        connections: options.connections || 10,
        duration: options.duration ?? DURATION,
        amount: options.amount,
        ...options.extra,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    autocannon.track(instance, { renderProgressBar: false });
  });
}

function collectProcessStats() {
  const mem = process.memoryUsage();
  const load = os.loadavg();
  return {
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    loadAvg1: load[0].toFixed(2),
    loadAvg5: load[1].toFixed(2),
  };
}

function summarizeResult(result, scenarioName) {
  const requests = result.requests || {};
  const latency = result.latency || {};
  const errors = result.errors || 0;
  const total = requests.total || 0;
  const errorRatePct = total > 0 ? (errors / total) * 100 : 0;
  const durationSec = (result.duration || 0) / 1000;
  const throughputReqPerSec = durationSec > 0 ? total / durationSec : (requests.average ?? 0);

  const avgLatency = latency.mean ?? latency.avg ?? 0;
  const p99 = latency.p99 ?? latency.p99_9 ?? 0;
  const maxLatency = latency.max ?? 0;

  const ok = avgLatency <= TARGET_LATENCY_MS && errorRatePct < TARGET_ERROR_RATE_PCT;
  return {
    name: scenarioName,
    requests: total,
    errors,
    errorRatePct,
    throughputReqPerSec,
    latencyAvgMs: avgLatency,
    latencyP99Ms: p99,
    latencyMaxMs: maxLatency,
    durationSec,
    pass: ok,
    details: result,
  };
}

async function scenario1_100ClientsSignup() {
  log('\n--- Scénario 1 : 100 clients simultanés (send-otp) ---');
  const result = await runAutocannon({
    url: `${API_PREFIX}/auth/send-otp`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+2250700000999' }),
    connections: 100,
    amount: 100,
  });
  return summarizeResult(result, '100 clients send-otp');
}

async function scenario2_50Orders() {
  if (SKIP_AUTH || !CLIENT_TOKEN) {
    log('\n--- Scénario 2 : 50 commandes (ignoré, CLIENT_TOKEN manquant ou PERF_SKIP_AUTH=1) ---');
    return { name: '50 commandes', skip: true };
  }
  log('\n--- Scénario 2 : 50 commandes créées en même temps ---');
  const body = JSON.stringify({
    restaurant_id: '33333333-3333-3333-3333-111111111111',
    delivery_address_id: '99999999-9999-9999-9999-111111111111',
    items: [{ menu_item_id: '55555555-5555-5555-5555-111111111111', quantity: 1 }],
    payment_method: 'cash',
  });
  const result = await runAutocannon({
    url: `${API_PREFIX}/orders`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLIENT_TOKEN}`,
    },
    body,
    connections: 50,
    amount: 50,
  });
  return summarizeResult(result, '50 commandes');
}

async function scenario3_1000GpsPerMinute() {
  if (SKIP_AUTH || !DELIVERY_TOKEN) {
    log('\n--- Scénario 3 : 1000 req GPS/min (ignoré, DELIVERY_TOKEN manquant ou PERF_SKIP_AUTH=1) ---');
    return { name: '1000 GPS/min', skip: true };
  }
  log('\n--- Scénario 3 : 1000 requêtes GPS/minute (livreurs) ---');
  const result = await runAutocannon({
    url: `${API_PREFIX}/delivery/location`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DELIVERY_TOKEN}`,
    },
    body: JSON.stringify({ latitude: 9.458, longitude: -5.63 }),
    connections: 20,
    duration: 60,
    extra: { timeout: 10000 },
  });
  return summarizeResult(result, '1000 GPS/min (60s)');
}

async function scenario4_500Notifications() {
  if (SKIP_AUTH || !ADMIN_TOKEN) {
    log('\n--- Scénario 4 : 500 notifications (ignoré, ADMIN_TOKEN manquant ou PERF_SKIP_AUTH=1) ---');
    return { name: '500 notifications', skip: true };
  }
  log('\n--- Scénario 4 : 500 notifications push (broadcast) ---');
  const result = await runAutocannon({
    url: `${API_PREFIX}/admin/notifications/broadcast`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ title: 'Test', body: 'Load test' }),
    connections: 50,
    amount: 500,
  });
  return summarizeResult(result, '500 notifications');
}

async function scenario5_100RestaurantsUpdateMenu() {
  if (SKIP_AUTH || !RESTAURANT_TOKEN) {
    log('\n--- Scénario 5 : 100 restaurants menu (ignoré, RESTAURANT_TOKEN manquant ou PERF_SKIP_AUTH=1) ---');
    return { name: '100 restaurants menu', skip: true };
  }
  log('\n--- Scénario 5 : 100 restaurants mettent à jour le menu ---');
  const result = await runAutocannon({
    url: `${API_PREFIX}/restaurants/me`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESTAURANT_TOKEN}`,
    },
    body: JSON.stringify({ description: 'Updated description load test' }),
    connections: 100,
    amount: 100,
  });
  return summarizeResult(result, '100 restaurants PUT /me');
}

function writeReport(summaries, startTime, endTime) {
  const stats = collectProcessStats();
  log('\n========== RAPPORT DE PERFORMANCE ==========');
  log(`Base URL: ${BASE_URL}`);
  log(`Début: ${new Date(startTime).toISOString()}`);
  log(`Fin:   ${new Date(endTime).toISOString()}`);
  log(`Durée totale: ${((endTime - startTime) / 1000).toFixed(1)} s`);
  log('--- Ressources (processus runner) ---');
  log(`RAM (heap used): ${stats.heapUsedMB} MB`);
  log(`RAM (RSS):       ${stats.rssMB} MB`);
  log(`Load avg (1m):  ${stats.loadAvg1}`);
  log('--- Seuils ---');
  log(`Latence cible:  < ${TARGET_LATENCY_MS} ms`);
  log(`Taux d'erreur:  < ${TARGET_ERROR_RATE_PCT}%`);
  log('--- Résultats par scénario ---');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  summaries.forEach((s) => {
    if (s.skip) {
      skipped++;
      log(`  [SKIP] ${s.name}`);
      return;
    }
    if (s.pass) passed++;
    else failed++;
    log(`  [${s.pass ? 'OK' : 'FAIL'}] ${s.name}`);
    log(`    Requêtes:     ${s.requests}`);
    log(`    Erreurs:      ${s.errors} (${formatNumber(s.errorRatePct)}%)`);
    log(`    Débit:        ${formatNumber(s.throughputReqPerSec)} req/s`);
    log(`    Latence avg:  ${formatNumber(s.latencyAvgMs)} ms`);
    log(`    Latence p99:  ${formatNumber(s.latencyP99Ms)} ms`);
    log(`    Latence max:  ${formatNumber(s.latencyMaxMs)} ms`);
  });

  log('--- Bilan ---');
  log(`Réussis: ${passed}, Échoués: ${failed}, Ignorés: ${skipped}`);
  log('==============================================\n');

  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(
    reportDir,
    `report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`
  );
  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
  log(`Rapport enregistré: ${reportPath}`);
}

async function main() {
  const startTime = Date.now();
  log('BAIBEBALO - Tests de charge (autocannon)');
  log(`URL: ${BASE_URL} | Durée par scénario: ${DURATION}s`);

  const summaries = [];

  try {
    summaries.push(await scenario1_100ClientsSignup());
  } catch (e) {
    log(`Scénario 1 erreur: ${e.message}`);
    summaries.push({ name: '100 clients send-otp', skip: false, pass: false, error: e.message });
  }

  try {
    summaries.push(await scenario2_50Orders());
  } catch (e) {
    log(`Scénario 2 erreur: ${e.message}`);
    summaries.push({ name: '50 commandes', skip: false, pass: false, error: e.message });
  }

  try {
    summaries.push(await scenario3_1000GpsPerMinute());
  } catch (e) {
    log(`Scénario 3 erreur: ${e.message}`);
    summaries.push({ name: '1000 GPS/min', skip: false, pass: false, error: e.message });
  }

  try {
    summaries.push(await scenario4_500Notifications());
  } catch (e) {
    log(`Scénario 4 erreur: ${e.message}`);
    summaries.push({ name: '500 notifications', skip: false, pass: false, error: e.message });
  }

  try {
    summaries.push(await scenario5_100RestaurantsUpdateMenu());
  } catch (e) {
    log(`Scénario 5 erreur: ${e.message}`);
    summaries.push({ name: '100 restaurants menu', skip: false, pass: false, error: e.message });
  }

  const endTime = Date.now();
  writeReport(summaries, startTime, endTime);
}

// Exécution standalone : node tests/performance/load.test.js
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Jest : au moins un test pour que le suite soit valide (fichier ignoré par défaut via testPathIgnorePatterns)
describe('Performance load', () => {
  it('has load scenarios defined', () => {
    expect(typeof main).toBe('function');
    expect(typeof scenario1_100ClientsSignup).toBe('function');
  });
});
