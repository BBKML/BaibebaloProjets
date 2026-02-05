/**
 * BAIBEBALO API - Configuration du serveur
 * Plateforme de livraison locale - Korhogo, Côte d'Ivoire
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');
const logger = require('./utils/logger');
const { testConnection } = require('./database/db');
const { generalLimiter, notFound, errorHandler } = require('./middlewares/validators');

// Import des routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const orderRoutes = require('./routes/order.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const adminRoutes = require('./routes/admin.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Initialiser les cron jobs
require('./jobs/cron');

// Créer l'application Express
const app = express();
const server = http.createServer(app);

// Configuration Socket.IO pour le temps réel
const io = socketIo(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Rendre io accessible globalement
app.set('io', io);

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression des réponses
app.use(compression());

// Logging HTTP
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting global
app.use(generalLimiter);

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'BAIBEBALO API is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
  });
});

// Routes API
const apiPrefix = `/api/${config.apiVersion}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/restaurants`, restaurantRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/delivery`, deliveryRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/webhooks`, webhookRoutes);

// Route 404
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Gestion WebSocket pour les mises à jour en temps réel
io.on('connection', (socket) => {
  logger.info(`Nouvelle connexion Socket.IO: ${socket.id}`);

  // Rejoindre une room spécifique (commande)
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    logger.debug(`Socket ${socket.id} a rejoint order_${orderId}`);
  });

  // Rejoindre une room livreur
  socket.on('join_delivery', (deliveryPersonId) => {
    socket.join(`delivery_${deliveryPersonId}`);
    logger.debug(`Socket ${socket.id} a rejoint delivery_${deliveryPersonId}`);
  });

  // Livreur met à jour sa position
  socket.on('update_location', async (data) => {
    try {
      const { deliveryPersonId, latitude, longitude } = data;
      
      // Mettre à jour dans la base de données
      const { query } = require('./database/db');
      await query(
        `UPDATE delivery_persons 
         SET current_latitude = $1, 
             current_longitude = $2, 
             last_location_update = NOW()
         WHERE id = $3`,
        [latitude, longitude, deliveryPersonId]
      );

      // Notifier les clients qui suivent ce livreur
      socket.broadcast.emit('delivery_location_updated', {
        deliveryPersonId,
        latitude,
        longitude,
        timestamp: new Date(),
      });

      logger.debug(`Position mise à jour: ${deliveryPersonId}`);
    } catch (error) {
      logger.error('Erreur update location:', error);
      socket.emit('error', { message: 'Erreur mise à jour position' });
    }
  });

  // Notification nouveau message
  socket.on('send_message', (data) => {
    const { orderId, message, sender } = data;
    io.to(`order_${orderId}`).emit('new_message', {
      orderId,
      message,
      sender,
      timestamp: new Date(),
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    logger.info(`Déconnexion Socket.IO: ${socket.id}`);
  });

  // Gestion des erreurs socket
  socket.on('error', (error) => {
    logger.error('Erreur Socket.IO:', error);
  });
});

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Afficher la bannière
    logger.info('\n' +
      '╔════════════════════════════════════════════════════════════╗\n' +
      '║                                                            ║\n' +
      '║   🚀 BAIBEBALO API Server                                  ║\n' +
      '║      Plateforme de Livraison Locale - Korhogo              ║\n' +
      '║                                                            ║\n' +
      '╚════════════════════════════════════════════════════════════╝\n'
    );

    // Tester la connexion à la base de données
    logger.info('📊 Test de connexion à la base de données...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('❌ Impossible de se connecter à la base de données');
      logger.error('Vérifiez votre configuration dans .env');
      logger.error('DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
      
      if (config.env === 'development') {
        logger.warn('⚠️  Le serveur va démarrer malgré l\'erreur DB (mode dev)');
      } else {
        throw new Error('Connexion base de données requise en production');
      }
    }

    // Démarrer le serveur
    server.listen(config.port, () => {
      logger.info('\n' +
        '╔════════════════════════════════════════════════════════════╗\n' +
        '║                                                            ║\n' +
        `║   Environment: ${config.env.padEnd(44)}║\n` +
        `║   Port: ${config.port.toString().padEnd(51)}║\n` +
        `║   API Version: ${config.apiVersion.padEnd(44)}║\n` +
        '║                                                            ║\n' +
        `║   🔗 http://localhost:${config.port}${' '.repeat(37 - config.port.toString().length)}║\n` +
        `║   📚 Health: http://localhost:${config.port}/health${' '.repeat(24 - config.port.toString().length)}║\n` +
        `║   📖 API: http://localhost:${config.port}/api/${config.apiVersion}${' '.repeat(26 - config.port.toString().length - config.apiVersion.length)}║\n` +
        '║                                                            ║\n' +
        '║   ✅ Serveur démarré avec succès!                          ║\n' +
        '║                                                            ║\n' +
        '╚════════════════════════════════════════════════════════════╝\n'
      );

      logger.info('📡 WebSocket prêt pour connexions temps réel');
      logger.info('⏰ Cron jobs initialisés');
      logger.info('\n💡 Appuyez sur Ctrl+C pour arrêter le serveur\n');
    });

    // Gérer les erreurs du serveur
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} déjà utilisé`);
        logger.error('Changez le PORT dans .env ou arrêtez l\'autre processus');
      } else {
        logger.error('❌ Erreur serveur:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Erreur de démarrage du serveur:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔥 Unhandled Rejection:', reason);
  logger.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  logger.error('🔥 Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} reçu, arrêt gracieux du serveur...`);
  
  // Fermer le serveur HTTP
  server.close(async () => {
    logger.info('✅ Serveur HTTP fermé');
    
    // Fermer les connexions Socket.IO
    io.close(() => {
      logger.info('✅ Socket.IO fermé');
    });
    
    // Fermer le pool de base de données
    try {
      const { closePool } = require('./database/db');
      await closePool();
      logger.info('✅ Pool PostgreSQL fermé');
    } catch (error) {
      logger.error('Erreur fermeture pool DB:', error);
    }
    
    logger.info('👋 Au revoir!\n');
    process.exit(0);
  });

  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    logger.error('⚠️  Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Exports
module.exports = { 
  app, 
  server, 
  io,
  startServer 
};