const { query } = require('./src/database/db');

(async () => {
  try {
    const result = await query('SELECT id, name, logo, banner FROM restaurants LIMIT 10');
    console.log('\n=== Images des restaurants ===\n');
    result.rows.forEach(r => {
      console.log(`📍 ${r.name}`);
      console.log(`   Logo: ${r.logo || '❌ NULL'}`);
      console.log(`   Banner: ${r.banner || '❌ NULL'}`);
      console.log('');
    });
    process.exit(0);
  } catch (e) {
    console.error('Erreur:', e.message);
    process.exit(1);
  }
})();
