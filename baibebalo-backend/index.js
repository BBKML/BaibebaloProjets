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

// Imports locaux
const config = require('./src/config');
const logger = require('./src/utils/logger');
const db = require('./src/database/db');

// Créer l'application Express
const app = express();
const server = http.createServer(app);

// ================================
// CONFIGURATION SOCKET.IO
// ================================
const io = socketIO(server, {
  cors: {
    origin: '*', // En dev, accepter toutes les origines
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Rendre io accessible globalement
app.set('io', io);

// ================================
// MIDDLEWARES DE SÉCURITÉ
// ================================

// Helmet pour sécuriser les headers HTTP
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - En dev, accepter toutes les origines
app.use(cors({
  origin: '*',
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
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de requêtes, veuillez réessayer plus tard',
      },
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

// Routes d'authentification
app.use(`/api/${config.apiVersion}/auth`, require('./src/routes/auth.routes'));

// Routes utilisateurs
app.use(`/api/${config.apiVersion}/users`, require('./src/routes/user.routes'));

// Routes restaurants
app.use(`/api/${config.apiVersion}/restaurants`, require('./src/routes/restaurant.routes'));

// Routes commandes
app.use(`/api/${config.apiVersion}/orders`, require('./src/routes/order.routes'));

// Routes livreurs
app.use(`/api/${config.apiVersion}/delivery`, require('./src/routes/delivery.routes'));

// Routes admin
app.use(`/api/${config.apiVersion}/admin`, require('./src/routes/admin.routes'));

// Routes webhooks (paiements)
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

const startServer = async () => {
  try {
    // Tester la connexion à la base de données (optionnel en dev)
    try {
      await db.query('SELECT NOW()');
      logger.info('✅ Connexion à la base de données établie');
    } catch (dbError) {
      logger.warn('⚠️  Base de données non disponible (mode test sans DB)');
      logger.warn('   Certaines routes nécessiteront une DB connectée');
    }

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
      console.log(`   🌐 URL réseau: http://192.168.1.7:${PORT}`);
      console.log(`   💡 Pour accéder depuis un téléphone, utilisez: http://192.168.1.7:${PORT}`);
      console.log(`   📖 API Version: ${config.apiVersion}`);
      console.log('');
      console.log('   🧪 ROUTES DE TEST DISPONIBLES:');
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/users`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/orders`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/auth/login`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/auth/register`);
      console.log(`   POST   http://localhost:${PORT}/api/${config.apiVersion}/test/restaurants/search`);
      console.log('');
      console.log('   📚 Documentation complète: http://localhost:3000/');
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

// Lancer le serveur
startServer();

// Export pour les tests
module.exports = { app, server, io };