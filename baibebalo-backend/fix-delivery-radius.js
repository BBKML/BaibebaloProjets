/**
 * Script pour corriger le rayon de livraison de tous les restaurants
 * Assure un minimum de 15km pour permettre les commandes
 */

const { query, pool } = require('./src/database/db');

async function fixDeliveryRadius() {
  try {
    console.log('🔧 Correction des rayons de livraison...\n');
    
    // Mettre à jour tous les restaurants avec un rayon < 15km
    const result = await query(
      `UPDATE restaurants 
       SET delivery_radius = 15 
       WHERE delivery_radius < 15 OR delivery_radius IS NULL
       RETURNING id, name, delivery_radius`,
      []
    );
    
    console.log(`✅ ${result.rows.length} restaurant(s) mis à jour:`);
    result.rows.forEach(resto => {
      console.log(`   - ${resto.name}: ${resto.delivery_radius} km`);
    });
    
    // Vérifier le restaurant spécifique
    const restaurantId = '61033d58-9128-4a17-a690-244cb53cbf33';
    const checkResult = await query(
      'SELECT id, name, latitude, longitude, delivery_radius FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (checkResult.rows.length > 0) {
      const restaurant = checkResult.rows[0];
      console.log(`\n✅ Restaurant ${restaurant.name}:`);
      console.log(`   Rayon de livraison: ${restaurant.delivery_radius} km`);
      console.log(`   Coordonnées: ${restaurant.latitude}, ${restaurant.longitude}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

(async () => {
  await fixDeliveryRadius();
})();
