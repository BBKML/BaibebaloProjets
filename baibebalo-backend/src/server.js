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
const notificationRoutes = require('./routes/notification.routes');
const adsRoutes = require('./routes/ads.routes');

// Initialiser les cron jobs
require('./jobs/cron');

// Créer l'application Express
const app = express();
const server = http.createServer(app);

// Derrière un reverse proxy (Render, etc.) : utiliser X-Forwarded-Proto / Host pour les URLs publiques
app.set('trust proxy', 1);

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
app.use(helmet({
  // Désactiver certaines protections pour permettre l'accès aux fichiers statiques
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Désactiver CSP pour les fichiers statiques
}));
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers uploadés localement (si provider = local)
if (config.upload?.provider === 'local') {
  const path = require('path');
  const fs = require('fs');
  const uploadDir = config.upload?.local?.uploadDir || './uploads';
  const publicPath = config.upload?.local?.publicPath || '/uploads';
  
  // Résoudre le chemin absolu
  const absoluteUploadDir = path.resolve(uploadDir);
  
  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(absoluteUploadDir)) {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
    logger.info(`Dossier upload créé: ${absoluteUploadDir}`);
  }
  
  // Servir les fichiers statiques avec chemin absolu
  // IMPORTANT: Ce middleware doit être AVANT les routes API pour éviter les conflits
  app.use(publicPath, express.static(absoluteUploadDir, {
    // Options pour servir les fichiers
    dotfiles: 'ignore',
    etag: true,
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: (res) => {
      // Définir les headers CORS pour les images
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));
  logger.info(`Fichiers uploads servis depuis: ${publicPath} -> ${absoluteUploadDir}`);
  logger.info(`Test URL: http://localhost:${config.port || 5000}${publicPath}/admin-profiles/[nom-fichier]`);
}

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

// Route de test pour vérifier l'accès aux fichiers statiques
if (config.upload?.provider === 'local' && config.env === 'development') {
  app.get('/test-uploads', (req, res) => {
    const path = require('path');
    const fs = require('fs');
    const uploadDir = path.resolve(config.upload?.local?.uploadDir || './uploads');
    const adminProfilesDir = path.join(uploadDir, 'admin-profiles');
    
    let files = [];
    if (fs.existsSync(adminProfilesDir)) {
      files = fs.readdirSync(adminProfilesDir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    }
    
    res.json({
      success: true,
      uploadDir: uploadDir,
      adminProfilesDir: adminProfilesDir,
      exists: fs.existsSync(adminProfilesDir),
      files: files.slice(0, 5), // Premiers 5 fichiers
      publicPath: config.upload?.local?.publicPath || '/uploads',
      testUrl: `http://localhost:${config.port || 5000}${config.upload?.local?.publicPath || '/uploads'}/admin-profiles/${files[0] || 'test.jpg'}`,
    });
  });
}

// Routes API
const apiPrefix = `/api/${config.apiVersion}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/restaurants`, restaurantRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/delivery`, deliveryRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/webhooks`, webhookRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/ads`, adsRoutes);

// Route 404
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Middleware d'authentification pour WebSocket
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn(`Tentative de connexion WebSocket sans token: ${socket.id}`);
      return next(new Error('Token manquant'));
    }

    // Vérifier le token JWT
    const { verifyAccessToken } = require('./middlewares/auth');
    const decoded = verifyAccessToken(token);

    // Vérifier que c'est un admin
    if (decoded.type !== 'admin') {
      logger.warn(`Tentative de connexion WebSocket non-admin: ${socket.id}, type: ${decoded.type}`);
      return next(new Error('Accès réservé aux administrateurs'));
    }

    // Vérifier que l'admin existe et est actif
    const { query } = require('./database/db');
    const adminResult = await query(
      'SELECT id, email, status FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (adminResult.rows.length === 0) {
      logger.warn(`Admin introuvable pour WebSocket: ${socket.id}, admin_id: ${decoded.id}`);
      return next(new Error('Admin introuvable'));
    }

    if (adminResult.rows[0].status !== 'active') {
      logger.warn(`Admin inactif pour WebSocket: ${socket.id}, admin_id: ${decoded.id}`);
      return next(new Error('Compte admin inactif'));
    }

    // Attacher les informations de l'admin au socket
    socket.adminId = decoded.id;
    socket.adminType = decoded.type;
    socket.adminEmail = adminResult.rows[0].email;

    logger.info(`WebSocket authentifié: ${socket.id}, admin: ${decoded.id}`);
    next();
  } catch (error) {
    logger.error(`Erreur authentification WebSocket: ${socket.id}`, error);
    next(new Error('Authentification échouée'));
  }
});

// Namespace pour les partenaires (restaurants) - pas besoin d'auth admin
const partnersNamespace = io.of('/partners');

partnersNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn(`Connexion WebSocket partenaire sans token: ${socket.id}`);
      return next(new Error('Token manquant'));
    }

    const { verifyAccessToken } = require('./middlewares/auth');
    const decoded = verifyAccessToken(token);

    // Accepter restaurant ou delivery
    if (decoded.type !== 'restaurant' && decoded.type !== 'delivery') {
      return next(new Error('Accès réservé aux partenaires'));
    }

    socket.userId = decoded.id;
    socket.userType = decoded.type;
    
    logger.info(`WebSocket partenaire authentifié: ${socket.id}, type: ${decoded.type}, id: ${decoded.id}`);
    next();
  } catch (error) {
    logger.error(`Erreur auth WebSocket partenaire: ${socket.id}`, error);
    next(new Error('Authentification échouée'));
  }
});

partnersNamespace.on('connection', (socket) => {
  logger.info(`Partenaire connecté: ${socket.id}, type: ${socket.userType}, id: ${socket.userId}`);
  
  // Rejoindre automatiquement la room du partenaire
  socket.join(`${socket.userType}_${socket.userId}`);
  
  // === HANDLERS COMMUNS ===
  
  // Rejoindre un ticket de support pour recevoir les messages en temps réel
  socket.on('join_support_ticket', (ticketId) => {
    socket.join(`support_ticket_${ticketId}`);
    logger.debug(`Partenaire ${socket.userId} a rejoint support_ticket_${ticketId}`);
  });
  
  // Quitter un ticket de support
  socket.on('leave_support_ticket', (ticketId) => {
    socket.leave(`support_ticket_${ticketId}`);
    logger.debug(`Partenaire ${socket.userId} a quitté support_ticket_${ticketId}`);
  });

  // === HANDLERS LIVREURS ===
  
  // Rejoindre la room d'une commande
  socket.on('join_order', (data) => {
    const orderId = data?.order_id || data;
    socket.join(`order_${orderId}`);
    logger.debug(`Livreur ${socket.userId} a rejoint order_${orderId}`);
  });

  // Quitter la room d'une commande
  socket.on('leave_order', (data) => {
    const orderId = data?.order_id || data;
    socket.leave(`order_${orderId}`);
    logger.debug(`Livreur ${socket.userId} a quitté order_${orderId}`);
  });

  // Mettre à jour le statut de disponibilité
  socket.on('update_availability', async (data) => {
    if (socket.userType !== 'delivery') return;
    
    try {
      const { query } = require('./database/db');
      const newStatus = data.available ? 'available' : 'offline';
      
      await query(
        `UPDATE delivery_persons SET delivery_status = $1 WHERE id = $2`,
        [newStatus, socket.userId]
      );
      
      logger.debug(`Livreur ${socket.userId} disponibilité: ${newStatus}`);
      
      // Confirmer au livreur
      socket.emit('availability_updated', { status: newStatus });

      // Notifier les admins du changement de statut
      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Erreur update_availability:', error);
    }
  });

  // Mise à jour de la position GPS du livreur
  socket.on('location_update', async (data) => {
    if (socket.userType !== 'delivery') return;
    
    try {
      const { latitude, longitude, order_id } = data;
      
      // Sauvegarder la position
      const { query } = require('./database/db');
      await query(
        `UPDATE delivery_persons SET current_latitude = $1, current_longitude = $2, last_location_update = NOW() WHERE id = $3`,
        [latitude, longitude, socket.userId]
      );
      
      // Si une commande est en cours, notifier le client
      if (order_id) {
        io.to(`order_${order_id}`).emit('delivery_location_updated', {
          order_id,
          latitude,
          longitude,
          delivery_person_id: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Notifier les admins qui suivent tous les livreurs
      io.to('all_deliveries_tracking').emit('delivery_location', {
        delivery_person_id: socket.userId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      // Notifier les admins qui suivent ce livreur spécifiquement
      io.to(`track_delivery_${socket.userId}`).emit('delivery_location', {
        delivery_person_id: socket.userId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Erreur location_update:', error);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Partenaire déconnecté: ${socket.id}`);
    
    // Si c'est un livreur, le marquer comme hors ligne
    if (socket.userType === 'delivery') {
      const { query } = require('./database/db');
      query(
        `UPDATE delivery_persons SET delivery_status = 'offline' WHERE id = $1`,
        [socket.userId]
      ).catch(err => logger.error('Erreur mise à jour statut livreur:', err));

      // Notifier les admins du changement de statut
      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }

    // Si c'est un restaurant, notifier les admins
    if (socket.userType === 'restaurant') {
      io.to('admin_dashboard').emit('restaurant_status_changed', {
        restaurant_id: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Rendre le namespace partenaires accessible
app.set('partnersIo', partnersNamespace);

// Gestion WebSocket pour les mises à jour en temps réel (admins)
io.on('connection', (socket) => {
  logger.info(`Nouvelle connexion Socket.IO authentifiée: ${socket.id}, admin: ${socket.adminId}`);

  // Admin rejoint la room du dashboard pour recevoir les mises à jour
  socket.on('join_admin_dashboard', () => {
    if (socket.adminId) {
      socket.join('admin_dashboard');
      logger.debug(`Socket ${socket.id} (admin: ${socket.adminId}) a rejoint admin_dashboard`);
    } else {
      logger.warn(`Tentative join_admin_dashboard sans authentification: ${socket.id}`);
      socket.emit('error', { message: 'Non authentifié' });
    }
  });

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

  // Admin: suivre un livreur spécifique
  socket.on('track_delivery', (data) => {
    if (!socket.adminId) return;
    const deliveryPersonId = data?.delivery_person_id || data;
    socket.join(`track_delivery_${deliveryPersonId}`);
    logger.debug(`Admin ${socket.adminId} suit le livreur ${deliveryPersonId}`);
  });

  // Admin: arrêter de suivre un livreur
  socket.on('untrack_delivery', (data) => {
    if (!socket.adminId) return;
    const deliveryPersonId = data?.delivery_person_id || data;
    socket.leave(`track_delivery_${deliveryPersonId}`);
    logger.debug(`Admin ${socket.adminId} arrête de suivre le livreur ${deliveryPersonId}`);
  });

  // Admin: suivre tous les livreurs actifs
  socket.on('track_all_deliveries', async () => {
    if (!socket.adminId) return;
    socket.join('all_deliveries_tracking');
    logger.debug(`Admin ${socket.adminId} suit tous les livreurs`);
    
    // Envoyer immédiatement les positions actuelles de tous les livreurs
    try {
      const { query } = require('./database/db');
      const result = await query(`
        SELECT id, first_name, last_name, current_latitude, current_longitude, 
               delivery_status, last_location_update
        FROM delivery_persons 
        WHERE delivery_status IN ('available', 'on_delivery')
          AND current_latitude IS NOT NULL
      `);
      
      socket.emit('all_delivery_locations', {
        locations: result.rows.map(dp => ({
          id: dp.id,
          name: `${dp.first_name} ${dp.last_name || ''}`.trim(),
          latitude: dp.current_latitude,
          longitude: dp.current_longitude,
          status: dp.delivery_status,
          last_update: dp.last_location_update,
        })),
      });
    } catch (error) {
      logger.error('Erreur track_all_deliveries:', error);
    }
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