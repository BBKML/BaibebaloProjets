/**
 * Script pour corriger TOUS les restaurants et les localiser à Korhogo
 * Zone de Korhogo: latitude ~9.45, longitude ~-5.63
 */

const { query, pool } = require('./src/database/db');

// Coordonnées de Korhogo (centre-ville)
const KORHOGO_CENTER = {
  latitude: 9.4581,
  longitude: -5.6296,
};

// Rayon autour de Korhogo pour varier les positions
const KORHOGO_RADIUS = 0.03; // ~3km de variation

async function fixAllRestaurantsToKorhogo() {
  try {
    console.log('🔍 Vérification de tous les restaurants...\n');
    
    // Récupérer tous les restaurants
    const allRestaurants = await query(
      'SELECT id, name, latitude, longitude, delivery_radius FROM restaurants ORDER BY name',
      []
    );
    
    console.log(`📊 Total de restaurants: ${allRestaurants.rows.length}\n`);
    
    // Identifier ceux qui ne sont pas à Korhogo
    const restaurantsToFix = allRestaurants.rows.filter(resto => {
      const lat = Number.parseFloat(resto.latitude);
      const lon = Number.parseFloat(resto.longitude);
      
      // Korhogo: latitude entre 9.4 et 9.5, longitude entre -5.6 et -5.7
      return lat < 9.4 || lat > 9.5 || lon < -5.7 || lon > -5.6;
    });
    
    if (restaurantsToFix.length === 0) {
      console.log('✅ Tous les restaurants sont déjà à Korhogo !\n');
    } else {
      console.log(`⚠️  ${restaurantsToFix.length} restaurant(s) à corriger:\n`);
      restaurantsToFix.forEach(resto => {
        console.log(`   - ${resto.name}: ${resto.latitude}, ${resto.longitude}`);
      });
      
      console.log('\n🔧 Correction en cours...\n');
      
      // Corriger chaque restaurant
      for (const resto of restaurantsToFix) {
        // Générer des coordonnées aléatoires autour de Korhogo
        const newLat = KORHOGO_CENTER.latitude + (Math.random() * KORHOGO_RADIUS * 2 - KORHOGO_RADIUS);
        const newLon = KORHOGO_CENTER.longitude + (Math.random() * KORHOGO_RADIUS * 2 - KORHOGO_RADIUS);
        const deliveryRadius = Number.parseFloat(resto.delivery_radius) || 15;
        
        await query(
          'UPDATE restaurants SET latitude = $1, longitude = $2, delivery_radius = $3 WHERE id = $4',
          [newLat.toFixed(8), newLon.toFixed(8), Math.max(deliveryRadius, 15), resto.id]
        );
        
        console.log(`✅ ${resto.name}: ${newLat.toFixed(6)}, ${newLon.toFixed(6)} (rayon: ${Math.max(deliveryRadius, 15)} km)`);
      }
    }
    
    // S'assurer que tous ont un rayon minimum de 15km
    const updateRadius = await query(
      `UPDATE restaurants 
       SET delivery_radius = 15.0 
       WHERE delivery_radius < 15.0 OR delivery_radius IS NULL
       RETURNING id, name`,
      []
    );
    
    if (updateRadius.rows.length > 0) {
      console.log(`\n✅ ${updateRadius.rows.length} restaurant(s) avec rayon mis à jour à 15 km minimum`);
    }
    
    // Vérification finale
    console.log('\n📊 Vérification finale:\n');
    const finalCheck = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN latitude BETWEEN 9.4 AND 9.5 AND longitude BETWEEN -5.7 AND -5.6 THEN 1 END) as in_korhogo,
        COUNT(CASE WHEN delivery_radius >= 15 THEN 1 END) as good_radius
      FROM restaurants`,
      []
    );
    
    const stats = finalCheck.rows[0];
    console.log(`   Total restaurants: ${stats.total}`);
    console.log(`   À Korhogo: ${stats.in_korhogo}`);
    console.log(`   Rayon >= 15km: ${stats.good_radius}`);
    
    if (stats.in_korhogo === stats.total && stats.good_radius === stats.total) {
      console.log('\n✅ Tous les restaurants sont correctement configurés pour Korhogo !');
    } else {
      console.log('\n⚠️  Certains restaurants nécessitent encore une attention');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

(async () => {
  await fixAllRestaurantsToKorhogo();
})();
