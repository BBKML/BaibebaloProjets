/**
 * BAIBEBALO API - Point d'entrée principal (AVEC ROUTES DE TEST)
 * Plateforme de livraison locale - Korhogo, Côte d'Ivoire
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
const os = require('os');

// Imports locaux
const config = require('./src/config');
const logger = require('./src/utils/logger');
const db = require('./src/database/db');

// Créer l'application Express
const app = express();
const server = http.createServer(app);

// Derrière un reverse proxy (Render, etc.) : obligatoire pour X-Forwarded-For et rate-limit
app.set('trust proxy', 1);

// ================================
// CONFIGURATION SOCKET.IO
// ================================
const io = socketIO(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Rendre io accessible globalement
app.set('io', io);

// ================================
// NAMESPACE /client (app client - suivi commande temps réel)
// ================================
const clientNamespace = io.of('/client');
clientNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Token manquant'));
    const { verifyAccessToken } = require('./src/middlewares/auth');
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
      const { query } = require('./src/database/db');
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
// NAMESPACE /partners (restaurants + livreurs - temps réel commandes, position)
// ================================
const partnersNamespace = io.of('/partners');
partnersNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Token manquant'));
    const { verifyAccessToken } = require('./src/middlewares/auth');
    const decoded = verifyAccessToken(token);
    if (decoded.type !== 'restaurant' && decoded.type !== 'delivery_person') {
      return next(new Error('Accès réservé aux partenaires'));
    }
    socket.userId = decoded.id;
    socket.userType = decoded.type;
    next();
  } catch (e) {
    next(new Error('Authentification échouée'));
  }
});
partnersNamespace.on('connection', (socket) => {
  // Rooms utilisées par les contrôleurs : restaurant_<id>, delivery_<id>
  const roomPrefix = socket.userType === 'delivery_person' ? 'delivery' : socket.userType;
  socket.join(`${roomPrefix}_${socket.userId}`);
  socket.on('join_support_ticket', (ticketId) => {
    socket.join(`support_ticket_${ticketId}`);
  });
  socket.on('leave_support_ticket', (ticketId) => {
    socket.leave(`support_ticket_${ticketId}`);
  });
  socket.on('join_order', (data) => {
    const orderId = data?.order_id || data;
    if (orderId) socket.join(`order_${orderId}`);
  });
  socket.on('leave_order', (data) => {
    const orderId = data?.order_id || data;
    if (orderId) socket.leave(`order_${orderId}`);
  });
  socket.on('update_availability', async (data) => {
    if (socket.userType !== 'delivery_person') return;
    try {
      const { query } = require('./src/database/db');
      const newStatus = data.available ? 'available' : 'offline';
      await query(
        'UPDATE delivery_persons SET delivery_status = $1 WHERE id = $2',
        [newStatus, socket.userId]
      );
      socket.emit('availability_updated', { status: newStatus });
      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn('update_availability:', err.message);
    }
  });
  socket.on('location_update', async (data) => {
    if (socket.userType !== 'delivery_person') return;
    try {
      const { latitude, longitude, order_id } = data || {};

      // Validation des coordonnées GPS
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (
        !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180
      ) {
        logger.warn(`location_update: coordonnées invalides de ${socket.userId}`, { latitude, longitude });
        return;
      }

      const { query } = require('./src/database/db');
      await query(
        'UPDATE delivery_persons SET current_latitude = $1, current_longitude = $2, last_location_update = NOW() WHERE id = $3',
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
    } catch (err) {
      logger.warn('location_update:', err.message);
    }
  });
  socket.on('disconnect', () => {
    if (socket.userType === 'delivery_person') {
      require('./src/database/db').query(
        "UPDATE delivery_persons SET delivery_status = 'offline' WHERE id = $1",
        [socket.userId]
      ).catch(err => logger.error('Erreur statut livreur:', err.message));
      io.to('admin_dashboard').emit('delivery_status_changed', {
        delivery_person_id: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  });
});
app.set('partnersIo', partnersNamespace);

// ================================
// NAMESPACE / (défaut) - Admin dashboard
// Authentification obligatoire : admin uniquement
// ================================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Token manquant'));
    const { verifyAccessToken } = require('./src/middlewares/auth');
    const decoded = verifyAccessToken(token);
    if (decoded.type !== 'admin') {
      return next(new Error('Accès réservé aux administrateurs'));
    }
    socket.userId = decoded.id;
    socket.userType = decoded.type;
    next();
  } catch (e) {
    next(new Error('Authentification échouée'));
  }
});
io.on('connection', (socket) => {
  socket.join('admin_dashboard');
  socket.on('track_all_deliveries', () => {
    socket.join('all_deliveries_tracking');
  });
  socket.on('track_delivery', (deliveryPersonId) => {
    if (deliveryPersonId) socket.join(`track_delivery_${deliveryPersonId}`);
  });
  socket.on('untrack_delivery', (deliveryPersonId) => {
    if (deliveryPersonId) socket.leave(`track_delivery_${deliveryPersonId}`);
  });
  socket.on('disconnect', () => {
    logger.debug(`Admin ${socket.userId} déconnecté du dashboard`);
  });
});

// ================================
// MIDDLEWARES DE SÉCURITÉ
// ================================

// Helmet pour sécuriser les headers HTTP
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - config.cors.origin : en dev toutes origines, en prod liste CORS_ORIGIN
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Configuration Helmet pour permettre l'accès aux fichiers statiques
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Désactiver CSP pour les fichiers statiques
}));

// Rate limiting global (désactivé en dev pour les tests)
if (config.env === 'production') {
  const limiter = rateLimit({
    windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000,
    max: config.rateLimit?.maxRequests || 100,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de requêtes, veuillez réessayer plus tard',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    // keyGenerator évite toute validation IP / X-Forwarded-For qui peut faire planter derrière Render
    keyGenerator: (req) => {
      const ip = req.ip || (req.get && req.get('x-forwarded-for'))?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      return String(ip);
    },
  });
  app.use('/api/', limiter);
}

// ================================
// MIDDLEWARES DE BASE
// ================================

// Body parsers
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
      // Le Content-Type sera automatiquement défini par express.static selon l'extension
    }
  }));
  logger.info(`✅ Fichiers uploads servis depuis: ${publicPath} -> ${absoluteUploadDir}`);
  logger.info(`📸 Test URL: http://localhost:${config.port || 5000}${publicPath}/admin-profiles/[nom-fichier]`);
}

// Logging HTTP
app.use(morgan('dev'));

// Ajouter le timestamp de la requête
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ================================
// ROUTES DE BASE
// ================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      version: config.apiVersion,
    },
  });
});

// Test connexion base de données
app.get('/health/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    res.json({
      success: true,
      data: {
        status: 'Connected',
        timestamp: result.rows[0].time,
      },
    });
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'DB_CONNECTION_ERROR',
        message: 'Erreur de connexion à la base de données',
        details: config.env === 'development' ? error.message : undefined,
      },
    });
  }
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'BAIBEBALO API',
      version: config.apiVersion,
      description: 'API de livraison locale - Korhogo, Côte d\'Ivoire',
      status: 'running',
      endpoints: {
        health: '/health',
        healthDb: '/health/db',
        api: `/api/${config.apiVersion}`,
        testRoutes: `/api/${config.apiVersion}/test`,
      },
      documentation: 'Utilisez Postman ou Thunder Client pour tester',
    },
  });
});

// ================================
// ROUTES API DE TEST
// ================================

// Importer les routes de test
const testRoutes = require('./src/routes/test.routes');
app.use(`/api/${config.apiVersion}/test`, testRoutes);

// ================================
// ROUTES API RÉELLES
// ================================

// Routes publiques (sans authentification) - AVANT les autres routes
const publicRoutes = require('./src/routes/public.routes');
logger.info(`Enregistrement route publique: /api/${config.apiVersion}/public`);
app.use(`/api/${config.apiVersion}/public`, publicRoutes);
logger.debug('Route publique enregistrée avec succès');

// Routes d'authentification
app.use(`/api/${config.apiVersion}/auth`, require('./src/routes/auth.routes'));

// Routes utilisateurs
app.use(`/api/${config.apiVersion}/users`, require('./src/routes/user.routes'));

// Routes restaurants
app.use(`/api/${config.apiVersion}/restaurants`, require('./src/routes/restaurant.routes'));

// Routes recherche
app.use(`/api/${config.apiVersion}/search`, require('./src/routes/search.routes'));

// Routes commandes
app.use(`/api/${config.apiVersion}/orders`, require('./src/routes/order.routes'));

// Routes notifications
app.use(`/api/${config.apiVersion}/notifications`, require('./src/routes/notification.routes'));

// Routes livreurs
app.use(`/api/${config.apiVersion}/delivery`, require('./src/routes/delivery.routes'));

// Routes admin
app.use(`/api/${config.apiVersion}/admin`, require('./src/routes/admin.routes'));

// Routes publicités (bannières, campagnes, stats)
app.use(`/api/${config.apiVersion}/ads`, require('./src/routes/ads.routes'));

// Routes webhooks (paiements - phase 2)
app.use(`/api/${config.apiVersion}/webhooks`, require('./src/routes/webhook.routes'));

// ================================
// GESTION DES ERREURS
// ================================

// Route non trouvée (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.url} non trouvée`,
      suggestion: 'Consultez la documentation à http://localhost:3000/',
    },
  });
});

// Gestionnaire d'erreurs global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Erreur non gérée', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
      },
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token invalide ou expiré',
      },
    });
  }

  // Erreur CORS
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Origine non autorisée',
      },
    });
  }

  // Erreur serveur par défaut
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: config.env === 'production' 
        ? 'Une erreur est survenue' 
        : err.message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
});

// ================================
// GESTION SOCKET.IO
// ================================

io.on('connection', (socket) => {
  logger.info('Nouvelle connexion Socket.IO', { socketId: socket.id });

  // Rejoindre une room (commande, utilisateur, etc.)
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.debug(`Socket ${socket.id} a rejoint la room ${room}`);
  });

  // Quitter une room
  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.debug(`Socket ${socket.id} a quitté la room ${room}`);
  });

  // Mise à jour position livreur (temps réel)
  socket.on('update_location', (data) => {
    if (data.orderId) {
      io.to(`order_${data.orderId}`).emit('delivery_location_updated', {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === ADMIN DASHBOARD ===

  // Rejoindre la room admin_dashboard (tableau de bord temps réel)
  socket.on('join_admin_dashboard', () => {
    socket.join('admin_dashboard');
    logger.debug(`Admin socket ${socket.id} a rejoint admin_dashboard`);
    socket.emit('admin_dashboard_joined', { success: true });
  });

  // Suivre la position d'un livreur spécifique
  socket.on('track_delivery', (data) => {
    const deliveryPersonId = data?.delivery_person_id;
    if (deliveryPersonId) {
      socket.join(`track_delivery_${deliveryPersonId}`);
      logger.debug(`Admin ${socket.id} suit le livreur ${deliveryPersonId}`);
    }
  });

  // Arrêter le suivi d'un livreur spécifique
  socket.on('untrack_delivery', (data) => {
    const deliveryPersonId = data?.delivery_person_id;
    if (deliveryPersonId) {
      socket.leave(`track_delivery_${deliveryPersonId}`);
    }
  });

  // Suivre tous les livreurs actifs
  socket.on('track_all_deliveries', () => {
    socket.join('all_deliveries_tracking');
    logger.debug(`Admin ${socket.id} suit tous les livreurs`);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    logger.info('Déconnexion Socket.IO', { socketId: socket.id });
  });
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

const gracefulShutdown = async (signal) => {
  logger.info(`Signal ${signal} reçu. Arrêt gracieux...`);

  server.close(async () => {
    logger.info('Serveur HTTP fermé');

    try {
      // Fermer la connexion à la base de données
      await db.end();
      logger.info('Connexion base de données fermée');
      
      logger.info('Arrêt complet');
      process.exit(0);
    } catch (error) {
      logger.error('Erreur lors de l\'arrêt', { error: error.message });
      process.exit(1);
    }
  });

  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    logger.error('Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

// Écouter les signaux d'arrêt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

const PORT = config.port;

// Fonction pour détecter l'IP locale du réseau
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les adresses internes (non IPv4) et loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  // Fallback : utiliser une variable d'environnement ou localhost
  return process.env.LOCAL_IP || 'localhost';
};

const startServer = async () => {
  try {
    // Tester la connexion à la base de données (optionnel en dev)
    try {
      await db.query('SELECT NOW()');
      logger.info('✅ Connexion à la base de données établie');
      
      // Synchroniser les paramètres depuis config/index.js vers app_settings
      try {
        const { syncSettingsFromConfig } = require('./src/utils/syncSettings');
        await syncSettingsFromConfig();
      } catch (syncError) {
        logger.warn('⚠️  Erreur synchronisation paramètres (non bloquant):', syncError.message);
      }
    } catch (dbError) {
      logger.warn('⚠️  Base de données non disponible (mode test sans DB)');
      logger.warn('   Certaines routes nécessiteront une DB connectée');
    }

    // Détecter l'IP locale
    const localIP = getLocalIP();

    // Démarrer le serveur (écouter sur toutes les interfaces pour permettre l'accès depuis le réseau local)
    const HOST = '0.0.0.0'; // Écouter sur toutes les interfaces pour permettre l'accès depuis le réseau local
    server.listen(PORT, HOST, () => {
      console.log('\n' + '═'.repeat(60));
      console.log('');
      console.log('   🚀 BAIBEBALO API - SERVEUR DÉMARRÉ');
      console.log('');
      console.log(`   📍 Port: ${PORT}`);
      console.log(`   📝 Environnement: ${config.env}`);
      console.log(`   🌐 URL locale: http://localhost:${PORT}`);
      if (localIP !== 'localhost') {
        console.log(`   🌐 URL réseau: http://${localIP}:${PORT}`);
        console.log(`   💡 Pour accéder depuis un téléphone, utilisez: http://${localIP}:${PORT}`);
      } else {
        console.log(`   ⚠️  IP réseau non détectée. Utilisez localhost ou définissez LOCAL_IP dans .env`);
      }
      console.log(`   📖 API Version: ${config.apiVersion}`);
      console.log('');
      console.log('   🧪 ROUTES DE TEST DISPONIBLES:');
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/users`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/orders`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/auth/login`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/auth/register`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/restaurants/search`);
      console.log('');
      console.log('═'.repeat(60) + '\n');
    });

  } catch (error) {
    logger.error('❌ Erreur au démarrage du serveur', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Arrêt propre : fermer le serveur et le pool PostgreSQL avant de quitter
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10000;

function setupGracefulShutdown() {
  let shuttingDown = false;

  const gracefulShutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Signal ${signal} reçu, arrêt propre en cours...`);

    const forceExit = () => {
      logger.warn('Arrêt forcé après timeout');
      process.exit(1);
    };
    const timeout = setTimeout(forceExit, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    server.close((err) => {
      if (err) logger.error('Erreur fermeture serveur HTTP', { error: err.message });
      db.close()
        .then(() => {
          clearTimeout(timeout);
          logger.info('Pool PostgreSQL fermé. Arrêt propre terminé.');
          process.exit(0);
        })
        .catch((dbErr) => {
          logger.error('Erreur fermeture pool DB', { error: dbErr.message });
          clearTimeout(timeout);
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Lancer le serveur (sauf en test : supertest utilise l'app sans listen)
if (process.env.NODE_ENV !== 'test') {
  startServer();
  setupGracefulShutdown();
}

// Export pour les tests
module.exports = { app, server, io };