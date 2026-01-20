/**
 * Script pour générer uniquement des tickets de support de test
 * Usage: node seed-tickets-only.js
 */

const { query } = require('./src/database/db');
const logger = require('./src/utils/logger');

// Générateur de données aléatoires
const random = {
  element: (arr) => arr[Math.floor(Math.random() * arr.length)],
  number: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
};

const seedTicketsOnly = async () => {
  try {
    console.log('\n════════════════════════════════════════');
    console.log('  GÉNÉRATION DE TICKETS DE SUPPORT');
    console.log('════════════════════════════════════════\n');
    
    logger.info('════════════════════════════════════════');
    logger.info('  GÉNÉRATION DE TICKETS DE SUPPORT');
    logger.info('════════════════════════════════════════');

    // Récupérer les IDs existants
    const usersResult = await query('SELECT id FROM users LIMIT 10');
    const restaurantsResult = await query('SELECT id FROM restaurants LIMIT 10');
    const deliveryResult = await query('SELECT id FROM delivery_persons LIMIT 10');
    const ordersResult = await query('SELECT id FROM orders LIMIT 20');
    const adminResult = await query('SELECT id FROM admins LIMIT 1');

    const users = usersResult.rows.map(r => r.id);
    const restaurants = restaurantsResult.rows.map(r => r.id);
    const deliveryPersons = deliveryResult.rows.map(r => r.id);
    const orders = ordersResult.rows.map(r => r.id);
    const adminId = adminResult.rows.length > 0 ? adminResult.rows[0].id : null;

    if (!adminId) {
      console.error('❌ Erreur: Aucun admin trouvé dans la base de données');
      throw new Error('Aucun admin trouvé dans la base de données');
    }
    
    console.log(`✓ ${users.length} utilisateurs trouvés`);
    console.log(`✓ ${restaurants.length} restaurants trouvés`);
    console.log(`✓ ${deliveryPersons.length} livreurs trouvés`);
    console.log(`✓ ${orders.length} commandes trouvées`);
    console.log(`✓ Admin ID: ${adminId}\n`);

    const ticketSubjects = [
      'Problème de livraison',
      'Commande manquante',
      'Paiement non reçu',
      'Problème avec le restaurant',
      'Application ne fonctionne pas',
      'Demande de remboursement',
      'Question sur ma commande',
      'Problème de connexion',
      'Code promo non valide',
      'Livraison en retard',
      'Nourriture froide',
      'Article manquant dans la commande',
      'Problème avec le livreur',
      'Facture incorrecte',
      'Demande d\'information',
      'Réclamation sur la qualité',
      'Problème de compte',
      'Question sur les promotions',
      'Erreur dans l\'application',
      'Suggestion d\'amélioration'
    ];

    const ticketMessages = [
      'Bonjour, j\'ai un problème avec ma commande. La livraison est en retard et je n\'ai pas reçu d\'informations.',
      'Ma commande n\'est pas arrivée alors que j\'ai payé. Pouvez-vous vérifier s\'il vous plaît ?',
      'Le paiement a été débité mais ma commande n\'a pas été confirmée. Aidez-moi s\'il vous plaît.',
      'Le restaurant a refusé ma commande sans raison. Que puis-je faire ?',
      'L\'application se bloque à chaque fois que j\'essaie de passer une commande.',
      'Je souhaite être remboursé car ma commande n\'est jamais arrivée.',
      'J\'ai une question concernant ma commande. Pouvez-vous m\'aider ?',
      'Je n\'arrive pas à me connecter à mon compte. Mot de passe oublié.',
      'Le code promo que j\'ai utilisé ne fonctionne pas. Pourquoi ?',
      'Ma livraison devait arriver il y a 2 heures. Où est mon livreur ?',
      'La nourriture que j\'ai reçue était froide. C\'est inacceptable.',
      'Il manque un article dans ma commande. Que dois-je faire ?',
      'Le livreur a été impoli avec moi. Je veux porter plainte.',
      'Le montant sur ma facture ne correspond pas à ce que j\'ai commandé.',
      'J\'aimerais avoir plus d\'informations sur le programme de fidélité.',
      'La qualité de la nourriture était très mauvaise. Je veux être remboursé.',
      'Je ne peux pas modifier mon profil. L\'application affiche une erreur.',
      'Comment fonctionnent les promotions ? Je ne comprends pas.',
      'Il y a un bug dans l\'application quand j\'essaie de voir mes commandes.',
      'J\'aimerais suggérer une amélioration pour l\'application.'
    ];

    const categories = ['order', 'payment', 'delivery', 'account', 'technical', 'other'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    const userTypes = ['user', 'restaurant', 'delivery'];

    const count = 25;
    console.log(`\n🎫 Création de ${count} tickets de support...\n`);
    logger.info(`Création de ${count} tickets de support...`);

    let createdCount = 0;
    for (let i = 0; i < count; i++) {
      const subject = random.element(ticketSubjects);
      const message = random.element(ticketMessages);
      const category = random.element(categories);
      const priority = random.element(priorities);
      const status = random.element(statuses);
      const userType = random.element(userTypes);
      
      // Sélectionner un ID utilisateur selon le type
      let userId = null;
      let orderId = null;
      
      if (userType === 'user' && users.length > 0) {
        userId = random.element(users);
        if (orders.length > 0 && random.boolean()) {
          orderId = random.element(orders);
        }
      } else if (userType === 'restaurant' && restaurants.length > 0) {
        userId = random.element(restaurants);
      } else if (userType === 'delivery' && deliveryPersons.length > 0) {
        userId = random.element(deliveryPersons);
      }

      // Générer le numéro de ticket
      const ticketNumberResult = await query('SELECT generate_ticket_number() as ticket_number');
      const ticketNumber = ticketNumberResult.rows[0].ticket_number;

      // Créer le ticket
      const ticketResult = await query(
        `INSERT INTO support_tickets (
          ticket_number, subject, description, category, priority,
          user_type, user_id, order_id, status, assigned_to,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          ticketNumber,
          subject,
          message,
          category,
          priority,
          userType,
          userId,
          orderId,
          status,
          status !== 'open' ? adminId : null,
          new Date(Date.now() - random.number(0, 30) * 24 * 60 * 60 * 1000),
          new Date(Date.now() - random.number(0, 25) * 24 * 60 * 60 * 1000)
        ]
      );

      // Créer le message initial seulement si on a un userId valide
      if (userId) {
        // Vérifier si la colonne is_internal existe
        const hasIsInternal = await query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ticket_messages' 
            AND column_name = 'is_internal'
          ) as exists
        `);
        
        if (hasIsInternal.rows[0].exists) {
          await query(
            `INSERT INTO ticket_messages (
              ticket_id, sender_type, sender_id, message, is_internal
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              ticketResult.rows[0].id,
              userType,
              userId,
              message,
              false
            ]
          );
        } else {
          await query(
            `INSERT INTO ticket_messages (
              ticket_id, sender_type, sender_id, message
            ) VALUES ($1, $2, $3, $4)`,
            [
              ticketResult.rows[0].id,
              userType,
              userId,
              message
            ]
          );
        }
      }

      // Ajouter des réponses si le ticket n'est pas ouvert
      if (status !== 'open' && random.boolean()) {
        const numReplies = random.number(1, 3);
        for (let j = 0; j < numReplies; j++) {
          const replyMessages = [
            'Merci pour votre message. Nous avons bien reçu votre demande et nous allons la traiter dans les plus brefs délais.',
            'Nous avons vérifié votre commande et tout semble correct. Pouvez-vous nous donner plus de détails ?',
            'Votre problème a été résolu. N\'hésitez pas à nous contacter si vous avez d\'autres questions.',
            'Nous sommes désolés pour ce désagrément. Nous avons pris les mesures nécessaires.',
            'Votre demande est en cours de traitement. Nous vous tiendrons informé dès que possible.'
          ];
          
          // Vérifier si la colonne is_internal existe
          const hasIsInternal = await query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ticket_messages' 
              AND column_name = 'is_internal'
            ) as exists
          `);
          
          if (hasIsInternal.rows[0].exists) {
            await query(
              `INSERT INTO ticket_messages (
                ticket_id, sender_type, sender_id, message, is_internal, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                ticketResult.rows[0].id,
                'admin',
                adminId,
                random.element(replyMessages),
                false,
                new Date(Date.now() - random.number(0, 20) * 24 * 60 * 60 * 1000)
              ]
            );
          } else {
            await query(
              `INSERT INTO ticket_messages (
                ticket_id, sender_type, sender_id, message, created_at
              ) VALUES ($1, $2, $3, $4, $5)`,
              [
                ticketResult.rows[0].id,
                'admin',
                adminId,
                random.element(replyMessages),
                new Date(Date.now() - random.number(0, 20) * 24 * 60 * 60 * 1000)
              ]
            );
          }
        }
      }
      
      createdCount++;
      if (createdCount % 5 === 0) {
        console.log(`  ✓ ${createdCount}/${count} tickets créés...`);
      }
    }

    // Vérifier le nombre de tickets créés
    const countResult = await query('SELECT COUNT(*) as count FROM support_tickets');
    const totalTickets = parseInt(countResult.rows[0].count);
    
    console.log(`\n✅ ${count} tickets de support créés avec succès !`);
    console.log(`📊 Total de tickets dans la base: ${totalTickets}\n`);
    
    logger.info(`✓ ${count} tickets de support créés avec succès`);
    logger.info(`📊 Total de tickets dans la base: ${totalTickets}`);
    logger.info('════════════════════════════════════════');
    logger.info('✅ TERMINÉ');
    logger.info('════════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Erreur lors de la création des tickets', { 
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Exécution
if (require.main === module) {
  seedTicketsOnly()
    .then(() => {
      logger.info('Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedTicketsOnly };
