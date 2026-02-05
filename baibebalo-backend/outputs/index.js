const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
    origin: [config.urls.frontend, config.urls.admin],
    methods: ['GET', 'POST'],
  },
});

// Rendre io accessible globalement
app.set('io', io);

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: [config.urls.frontend, config.urls.admin],
  credentials: true,
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      });
    } catch (error) {
      logger.error('Erreur update location:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Déconnexion Socket.IO: ${socket.id}`);
  });
});

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // Démarrer le serveur
    server.listen(config.port, () => {
      logger.info(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 BAIBEBALO API Server                      ║
║                                                ║
║   Environment: ${config.env.padEnd(33)}║
║   Port: ${config.port.toString().padEnd(40)}║
║   API Version: ${config.apiVersion.padEnd(33)}║
║                                                ║
║   📍 http://localhost:${config.port}                     ║
║   📚 Health: http://localhost:${config.port}/health        ║
║                                                ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt gracieux du serveur...');
  server.close(() => {
    logger.info('Serveur arrêté');
    process.exit(0);
  });
});

// Démarrer si exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };