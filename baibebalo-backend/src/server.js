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
const publicRoutes = require('./routes/public.routes');
logger.debug('Route publique chargée:', typeof publicRoutes);

// Initialiser les cron jobs
require('./jobs/cron');

// Créer l'application Express
const app = express();
const server = http.createServer(app);

// Derrière un reverse proxy (Render, etc.)
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

// Namespace pour l'app client (suivi commande, position livreur en temps réel)
const clientNamespace = io.of('/client');
clientNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Token manquant'));
    const { verifyAccessToken } = require('./middlewares/auth');
    const decoded = verifyAccessToken(token);
    if (decoded.type !== 'user' && decoded.type !== 'client') {
      return next(new Error('Accès réservé aux clients'));
    }
    socket.userId = decoded.id;
    next();
  } catch (e) {
    next(new Error('Authentification échouée'));
  }
});
clientNamespace.on('connection', (socket) => {
  socket.on('join_order', async (data) => {
    const orderId = data?.order_id || data;
    if (!orderId) return;
    try {
      const { query } = require('./database/db');
      const r = await query(
        'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, socket.userId]
      );
      if (r.rows.length > 0) {
        socket.join(`order_${orderId}`);
        logger.debug(`Client ${socket.userId} a rejoint order_${orderId}`);
      }
    } catch (err) {
      logger.warn('join_order client:', err.message);
    }
  });
  socket.on('leave_order', (data) => {
    const orderId = data?.order_id || data;
    if (orderId) socket.leave(`order_${orderId}`);
  });
});
app.set('clientIo', clientNamespace);

// ================================
// MIDDLEWARES DE SÉCURITÉ
// ================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ✅ CORRECTION CORS — methods + allowedHeaders ajoutés
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ✅ CORRECTION PREFLIGHT — répond aux requêtes OPTIONS avant le rate limiter
// Sans cette ligne, le navigateur bloque toutes les requêtes POST/PUT/DELETE
app.options('*', cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ================================
// MIDDLEWARES DE PARSING
// ================================
// Le rawBody est capturé pour la vérification HMAC des webhooks de paiement
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers uploadés localement (si provider = local)
if (config.upload?.provider === 'local') {
  const path = require('path');
  const fs = require('fs');
  const uploadDir = config.upload?.local?.uploadDir || './uploads';
  const publicPath = config.upload?.local?.publicPath || '/uploads';
  
  const absoluteUploadDir = path.resolve(uploadDir);
  
  if (!fs.existsSync(absoluteUploadDir)) {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
    logger.info(`Dossier upload créé: ${absoluteUploadDir}`);
  }
  
  app.use(publicPath, express.static(absoluteUploadDir, {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: (res) => {
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

// ================================
// ROUTES
// ================================

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
      files: files.slice(0, 5),
      publicPath: config.upload?.local?.publicPath || '/uploads',
      testUrl: `http://localhost:${config.port || 5000}${config.upload?.local?.publicPath || '/uploads'}/admin-profiles/${files[0] || 'test.jpg'}`,
    });
  });
}

// Préfixe API
const apiPrefix = `/api/${config.apiVersion}`;

// Routes publiques (sans authentification) - AVANT les autres routes
logger.info(`Enregistrement route publique: ${apiPrefix}/public`);
app.use(`${apiPrefix}/public`, publicRoutes);
logger.debug('Route publique enregistrée avec succès');

// Routes authentifiées
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

// ================================
// WEBSOCKET - Authentification middleware
// ================================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn(`Tentative de connexion WebSocket sans token: ${socket.id}`);
      return next(new Error('Token manquant'));
    }

    const { verifyAccessToken } = require('./middlewares/auth');
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'admin') {
      logger.warn(`Tentative de connexion WebSocket non-admin: ${socket.id}, type: ${decoded.type}`);
      return next(new Error('Accès réservé aux administrateurs'));
    }

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

// ================================
// WEBSOCKET - Namespace Partenaires
// ================================
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
  
  socket.join(`${socket.userType}_${socket.userId}`);
  
  socket.on('join_support_ticket', (ticketId) => {
    socket.join(`support_ticket_${ticketId}`);
    logger.debug(`Partenaire ${socket.userId} a rejoint support_ticket_${ticketId}`);
  });
  
  socket.on('leave_support_ticket', (ticketId) => {
    socket.leave(`support_ticket_${ticketId}`);
    logger.debug(`Partenaire ${socket.userId} a quitté support_ticket_${ticketId}`);
  });

  socket.on('join_order', (data) => {
    const orderId = data?.order_id || data;
    socket.join(`order_${orderId}`);
    logger.debug(`Livreur ${socket.userId} a rejoint order_${orderId}`);
  });

  socket.on('leave_order', (data) => {
    const orderId = data?.order_id || data;
    socket.leave(`order_${orderId}`);
    logger.debug(`Livreur ${socket.userId} a quitté order_${orderId}`);
  });

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
      socket.emit('availability_updated', { status: newStatus });

      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Erreur update_availability:', error);
    }
  });

  socket.on('location_update', async (data) => {
    if (socket.userType !== 'delivery') return;
    
    try {
      const { latitude, longitude, order_id } = data;
      
      const { query } = require('./database/db');
      await query(
        `UPDATE delivery_persons SET current_latitude = $1, current_longitude = $2, last_location_update = NOW() WHERE id = $3`,
        [latitude, longitude, socket.userId]
      );
      
      if (order_id) {
        const payload = {
          order_id,
          latitude,
          longitude,
          delivery_person_id: socket.userId,
          timestamp: new Date().toISOString(),
        };
        io.to(`order_${order_id}`).emit('delivery_location_updated', payload);
        const clientIo = app.get('clientIo');
        if (clientIo) clientIo.to(`order_${order_id}`).emit('delivery_location_updated', payload);
      }

      io.to('all_deliveries_tracking').emit('delivery_location', {
        delivery_person_id: socket.userId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

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
    
    if (socket.userType === 'delivery') {
      const { query } = require('./database/db');
      query(
        `UPDATE delivery_persons SET delivery_status = 'offline' WHERE id = $1`,
        [socket.userId]
      ).catch(err => logger.error('Erreur mise à jour statut livreur:', err));

      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }

    if (socket.userType === 'restaurant') {
      io.to('admin_dashboard').emit('restaurant_status_changed', {
        restaurant_id: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  });
});

app.set('partnersIo', partnersNamespace);

// Cron des propositions de course expirées
try {
  require('./jobs/cron').init(app);
} catch (e) {
  logger.warn('Cron init (propositions livreur) ignoré:', e.message);
}

// ================================
// WEBSOCKET - Handlers Admin
// ================================
io.on('connection', (socket) => {
  logger.info(`Nouvelle connexion Socket.IO authentifiée: ${socket.id}, admin: ${socket.adminId}`);

  socket.on('join_admin_dashboard', () => {
    if (socket.adminId) {
      socket.join('admin_dashboard');
      logger.debug(`Socket ${socket.id} (admin: ${socket.adminId}) a rejoint admin_dashboard`);
    } else {
      logger.warn(`Tentative join_admin_dashboard sans authentification: ${socket.id}`);
      socket.emit('error', { message: 'Non authentifié' });
    }
  });

  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    logger.debug(`Socket ${socket.id} a rejoint order_${orderId}`);
  });

  socket.on('join_delivery', (deliveryPersonId) => {
    socket.join(`delivery_${deliveryPersonId}`);
    logger.debug(`Socket ${socket.id} a rejoint delivery_${deliveryPersonId}`);
  });

  socket.on('track_delivery', (data) => {
    if (!socket.adminId) return;
    const deliveryPersonId = data?.delivery_person_id || data;
    socket.join(`track_delivery_${deliveryPersonId}`);
    logger.debug(`Admin ${socket.adminId} suit le livreur ${deliveryPersonId}`);
  });

  socket.on('untrack_delivery', (data) => {
    if (!socket.adminId) return;
    const deliveryPersonId = data?.delivery_person_id || data;
    socket.leave(`track_delivery_${deliveryPersonId}`);
    logger.debug(`Admin ${socket.adminId} arrête de suivre le livreur ${deliveryPersonId}`);
  });

  socket.on('track_all_deliveries', async () => {
    if (!socket.adminId) return;
    socket.join('all_deliveries_tracking');
    logger.debug(`Admin ${socket.adminId} suit tous les livreurs`);
    
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

  socket.on('update_location', async (data) => {
    try {
      const { deliveryPersonId, latitude, longitude } = data;
      
      const { query } = require('./database/db');
      await query(
        `UPDATE delivery_persons 
         SET current_latitude = $1, 
             current_longitude = $2, 
             last_location_update = NOW()
         WHERE id = $3`,
        [latitude, longitude, deliveryPersonId]
      );

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

  socket.on('send_message', (data) => {
    const { orderId, message, sender } = data;
    io.to(`order_${orderId}`).emit('new_message', {
      orderId,
      message,
      sender,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Déconnexion Socket.IO: ${socket.id}`);
  });

  socket.on('error', (error) => {
    logger.error('Erreur Socket.IO:', error);
  });
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================
const startServer = async () => {
  try {
    logger.info('\n' +
      '╔════════════════════════════════════════════════════════════╗\n' +
      '║                                                            ║\n' +
      '║   🚀 BAIBEBALO API Server                                  ║\n' +
      '║      Plateforme de Livraison Locale - Korhogo              ║\n' +
      '║                                                            ║\n' +
      '╚════════════════════════════════════════════════════════════╝\n'
    );

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

    if (dbConnected) {
      try {
        const { syncSettingsFromConfig } = require('./utils/syncSettings');
        await syncSettingsFromConfig();
      } catch (error) {
        logger.warn('⚠️  Erreur synchronisation paramètres (non bloquant):', error.message);
      }
    }

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

// ================================
// GESTION DES ERREURS GLOBALES
// ================================
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
  
  server.close(async () => {
    logger.info('✅ Serveur HTTP fermé');
    
    io.close(() => {
      logger.info('✅ Socket.IO fermé');
    });
    
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

  setTimeout(() => {
    logger.error('⚠️  Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { 
  app, 
  server, 
  io,
  startServer 
};
