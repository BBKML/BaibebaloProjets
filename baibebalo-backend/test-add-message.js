/**
 * Script de test pour ajouter un message admin à un ticket
 * Usage: node test-add-message.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration directe comme dans le backend
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'baibebalo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

console.log('Connexion à la base de données:', {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'baibebalo',
  user: process.env.DB_USER || 'postgres',
});

async function addTestMessage() {
  const client = await pool.connect();
  
  try {
    // ID du ticket à tester
    const ticketId = 'f8945baf-73e9-4e0c-bd1e-3fb50b6bf861';
    
    // Vérifier que le ticket existe
    const ticketResult = await client.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [ticketId]
    );
    
    if (ticketResult.rows.length === 0) {
      console.log('❌ Ticket non trouvé:', ticketId);
      return;
    }
    
    console.log('✅ Ticket trouvé:', ticketResult.rows[0].ticket_number);
    
    // Vérifier les messages existants
    const existingMessages = await client.query(
      'SELECT * FROM ticket_messages WHERE ticket_id = $1',
      [ticketId]
    );
    
    console.log('📨 Messages existants:', existingMessages.rows.length);
    existingMessages.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. [${m.sender_type}] ${m.message.substring(0, 50)}...`);
    });
    
    // Ajouter un message de test de l'admin
    const testMessage = 'Bonjour ! Ceci est une réponse test du support Baibebalo. Nous avons bien reçu votre demande et nous travaillons dessus. Merci de votre patience !';
    
    // Utiliser un ID admin fictif pour le test (ou null si pas d'admin)
    const adminId = null; // Pas d'admin réel pour le test
    
    const insertResult = await client.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'admin', $2, $3)
       RETURNING *`,
      [ticketId, adminId, testMessage]
    );
    
    console.log('✅ Message test ajouté:', insertResult.rows[0].id);
    
    // Mettre à jour le statut du ticket
    await client.query(
      `UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    
    console.log('✅ Ticket mis à jour en "in_progress"');
    
    // Vérifier les messages après ajout
    const allMessages = await client.query(
      'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at',
      [ticketId]
    );
    
    console.log('\n📨 Tous les messages maintenant:', allMessages.rows.length);
    allMessages.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. [${m.sender_type}] ${m.message.substring(0, 80)}...`);
    });
    
    console.log('\n✅ Test terminé ! Actualisez le chat dans l\'app restaurant.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

addTestMessage();
