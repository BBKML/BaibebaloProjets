const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

// Créer le pool de connexions
// Si DATABASE_URL est défini (Render, Railway, etc.), l'utiliser en priorité
const poolConfig = config.database.connectionString
  ? {
      connectionString: config.database.connectionString,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
      ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
      application_name: 'baibebalo-api',
    }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
      ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
      application_name: 'baibebalo-api',
    };

const pool = new Pool(poolConfig);

// Gestion des événements
pool.on('connect', () => {
  logger.debug('Nouvelle connexion PostgreSQL établie', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('error', (err) => {
  logger.error('Erreur inattendue sur le pool PostgreSQL', { 
    error: err.message,
    stack: err.stack,
  });
  // Ne pas quitter le processus, laisser le pool se régénérer
});

pool.on('remove', () => {
  logger.debug('Connexion PostgreSQL retirée du pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
  });
});

// Fonction query avec logging et retry logic
const query = async (text, params, retries = 3) => {
  const start = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log seulement si > 100ms ou en mode debug
      if (duration > 100 || config.logging.level === 'debug') {
        logger.debug('Query exécutée', {
          query: text.substring(0, 100), // Limiter la taille du log
          duration: `${duration}ms`,
          rows: result.rowCount,
          attempt: attempt > 1 ? attempt : undefined,
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Erreurs qui ne méritent pas de retry
      const noRetryErrors = [
        'unique_violation',
        'foreign_key_violation',
        'not_null_violation',
        'check_violation',
      ];

      if (noRetryErrors.includes(error.code) || attempt === retries) {
        logger.error('Erreur de query PostgreSQL', {
          query: text.substring(0, 200),
          params: JSON.stringify(params),
          error: error.message,
          code: error.code,
          detail: error.detail,
          attempt,
        });
        throw error;
      }

      // Attendre avant de retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      logger.warn(`Query failed, retrying in ${delay}ms`, {
        attempt,
        error: error.message,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Fonction pour les transactions avec retry
const transaction = async (callback, retries = 2) => {
  const client = await pool.connect();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.query('BEGIN');
      logger.debug('Transaction démarrée');

      const result = await callback(client);
      
      await client.query('COMMIT');
      logger.debug('Transaction committée avec succès', {
        attempt: attempt > 1 ? attempt : undefined,
      });
      
      return result;
    } catch (error) {
      lastError = error;
      
      try {
        await client.query('ROLLBACK');
        logger.warn('Transaction rollback', {
          error: error.message,
          attempt,
        });
      } catch (rollbackError) {
        logger.error('Erreur lors du rollback', {
          error: rollbackError.message,
        });
      }

      // Ne pas retry sur erreurs métier
      if (error.code?.startsWith('23') || attempt === retries) {
        logger.error('Transaction échouée', {
          error: error.message,
          code: error.code,
          attempt,
        });
        throw error;
      }

      // Attendre avant retry
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
      logger.info(`Transaction retry in ${delay}ms`, { attempt });
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      if (attempt === retries) {
        client.release();
      }
    }
  }

  client.release();
  throw lastError;
};

// Helper pour les requêtes paginées
const queryPaginated = async (text, params = [], page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  // Requête pour le total
  const countQuery = text.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Requête paginée
  const paginatedQuery = `${text} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const result = await query(paginatedQuery, [...params, limit, offset]);

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

// Helper pour bulk insert
const bulkInsert = async (table, columns, rows) => {
  if (!rows.length) return { rowCount: 0 };

  const placeholders = rows
    .map((_, rowIndex) => {
      const valuePlaceholders = columns
        .map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`)
        .join(', ');
      return `(${valuePlaceholders})`;
    })
    .join(', ');

  const values = rows.flat();
  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholders}
    RETURNING *
  `;

  return await query(sql, values);
};

// Test de connexion avec retry
const testConnection = async (maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await query('SELECT NOW() as time, current_database() as database, version()');
      logger.info('✅ Connexion PostgreSQL établie', {
        database: config.database.name,
        host: config.database.host,
        time: result.rows[0].time,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        poolSize: pool.totalCount,
      });
      return true;
    } catch (error) {
      logger.error(`❌ Échec connexion PostgreSQL (tentative ${attempt}/${maxRetries})`, {
        error: error.message,
        code: error.code,
        database: config.database.name,
        host: config.database.host,
      });
      // Afficher en console pour Render / hébergeurs (en prod le logger ne sort pas en console)
      if (process.env.NODE_ENV === 'production') {
        console.error(`[DB] Connexion échouée (${attempt}/${maxRetries}):`, error.message, error.code || '');
      }

      if (attempt === maxRetries) {
        return false;
      }

      // Attendre avant retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.info(`Nouvelle tentative dans ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Vérifier la santé du pool
const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
};

// Fermeture gracieuse
const close = async () => {
  try {
    await pool.end();
    logger.info('Pool PostgreSQL fermé proprement');
  } catch (error) {
    logger.error('Erreur lors de la fermeture du pool', { error: error.message });
    throw error;
  }
};

// Export avec méthode end() pour compatibilité
module.exports = {
  query,
  transaction,
  queryPaginated,
  bulkInsert,
  pool,
  testConnection,
  getPoolStats,
  close,
  end: close, // Alias pour db.end()
};