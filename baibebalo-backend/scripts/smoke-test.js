/**
 * Test de fumée - charge les modules principaux sans erreur.
 * Exécution: node scripts/smoke-test.js
 */
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
  } catch (err) {
    console.error('  ✗', name, '-', err.message);
    failed++;
  }
}

console.log('\n=== Backend - Smoke test ===\n');

check('Config', () => {
  const config = require('../src/config');
  if (!config || !config.port || !config.database) throw new Error('Config incomplète');
});

check('Logger', () => {
  const logger = require('../src/utils/logger');
  if (!logger || typeof logger.info !== 'function') throw new Error('Logger invalide');
});

check('Validators', () => {
  const v = require('../src/middlewares/validators');
  if (!v) throw new Error('Validators manquants');
});

check('Auth routes', () => {
  const r = require('../src/routes/auth.routes');
  if (!r || typeof r !== 'function') throw new Error('Auth routes invalides');
});

check('Order routes', () => {
  const r = require('../src/routes/order.routes');
  if (!r || typeof r !== 'function') throw new Error('Order routes invalides');
});

check('Restaurant routes', () => {
  const r = require('../src/routes/restaurant.routes');
  if (!r || typeof r !== 'function') throw new Error('Restaurant routes invalides');
});

console.log('');
if (failed > 0) {
  console.error('Échec:', failed, 'module(s) en erreur.\n');
  process.exit(1);
}
console.log('Tous les modules principaux se chargent correctement.\n');
process.exit(0);
