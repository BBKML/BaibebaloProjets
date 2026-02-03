/**
 * Vérifier et corriger les coordonnées d'une adresse qui provoque OUT_OF_DELIVERY_RANGE.
 * Usage: node check-address-coordinates.js
 *
 * Adresse concernée: 87c6223f-78ca-43f0-bd11-10b0605546bc
 * Restaurant: 9637ba9a-76e9-4642-a4dd-fb5873161bf3
 */

require('dotenv').config();
const { query } = require('./src/database/db');

const ADDRESS_ID = '87c6223f-78ca-43f0-bd11-10b0605546bc';
const RESTAURANT_ID = '9637ba9a-76e9-4642-a4dd-fb5873161bf3';

// Centre de Korhogo (Côte d'Ivoire) — à utiliser pour corriger une adresse de test
const KORHOGO_LAT = 9.4581;
const KORHOGO_LON = -5.6297;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function main() {
  console.log('\n=== Vérification adresse / restaurant ===\n');

  const addressResult = await query(
    'SELECT id, title, address_line, district, latitude, longitude FROM addresses WHERE id = $1',
    [ADDRESS_ID]
  );
  const restaurantResult = await query(
    'SELECT id, name, latitude, longitude, delivery_radius FROM restaurants WHERE id = $1',
    [RESTAURANT_ID]
  );

  if (addressResult.rows.length === 0) {
    console.log('❌ Adresse introuvable:', ADDRESS_ID);
    process.exit(1);
  }
  if (restaurantResult.rows.length === 0) {
    console.log('❌ Restaurant introuvable:', RESTAURANT_ID);
    process.exit(1);
  }

  const addr = addressResult.rows[0];
  const rest = restaurantResult.rows[0];

  console.log('Adresse:', addr.title || addr.address_line);
  console.log('  latitude:', addr.latitude, ' longitude:', addr.longitude);
  console.log('');
  console.log('Restaurant:', rest.name);
  console.log('  latitude:', rest.latitude, ' longitude:', rest.longitude);
  console.log('  rayon livraison (km):', rest.delivery_radius);
  console.log('');

  const al = parseFloat(addr.latitude);
  const ao = parseFloat(addr.longitude);
  const rl = parseFloat(rest.latitude);
  const ro = parseFloat(rest.longitude);

  if (Number.isNaN(al) || Number.isNaN(ao) || Number.isNaN(rl) || Number.isNaN(ro)) {
    console.log('❌ Coordonnées manquantes ou invalides. Impossible de calculer la distance.');
    if (!addr.latitude || !addr.longitude) {
      console.log('\n💡 L\'adresse n\'a pas de latitude/longitude. Il faut les renseigner (ex. via l\'app en repiquant la position sur la carte).');
      console.log('   Ou exécuter la correction ci-dessous pour mettre Korhogo par défaut.\n');
    }
  } else {
    const distance = haversineDistance(al, ao, rl, ro);
    const maxRadius = parseFloat(rest.delivery_radius) || 10;
    console.log('Distance calculée:', distance.toFixed(2), 'km');
    console.log('Rayon max du restaurant:', maxRadius, 'km');
    console.log(distance > maxRadius ? '❌ Hors zone → d\'où l\'erreur OUT_OF_DELIVERY_RANGE.' : '✅ Dans la zone.');
    console.log('');
  }

  // Proposer la correction (Korhogo)
  console.log('--- Correction possible ---');
  console.log('Pour que cette adresse soit dans la zone du restaurant (Korhogo), on peut');
  console.log('mettre ses coordonnées au centre de Korhogo:', KORHOGO_LAT, KORHOGO_LON);
  console.log('');
  console.log('Exécuter la correction ? (décommentez les lignes dans le script et relancez)');
  console.log('');

  const shouldFix = process.argv[2] === 'fix';
  if (shouldFix) {
    await query(
      'UPDATE addresses SET latitude = $1, longitude = $2 WHERE id = $3',
      [KORHOGO_LAT, KORHOGO_LON, ADDRESS_ID]
    );
    console.log('✅ Adresse mise à jour avec les coordonnées de Korhogo.');
    console.log('   Refaire un checkout dans l\'app : l\'erreur OUT_OF_DELIVERY_RANGE ne devrait plus apparaître.\n');
  } else {
    console.log('Pour corriger cette adresse (mettre Korhogo), exécutez:');
    console.log('   node check-address-coordinates.js fix\n');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
