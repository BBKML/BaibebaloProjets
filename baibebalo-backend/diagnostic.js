#!/usr/bin/env node

/**
 * Script de diagnostic BAIBEBALO Backend
 * Vérifie que tous les fichiers nécessaires sont présents
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║   🔍 DIAGNOSTIC BAIBEBALO Backend                          ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let totalIssues = 0;
let totalWarnings = 0;

// Fonction pour vérifier l'existence d'un fichier
function checkFile(filePath, required = true) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`${GREEN}✅${RESET} ${filePath}`);
    return true;
  } else {
    if (required) {
      console.log(`${RED}❌${RESET} ${filePath} ${RED}(MANQUANT - REQUIS)${RESET}`);
      totalIssues++;
    } else {
      console.log(`${YELLOW}⚠️ ${RESET} ${filePath} ${YELLOW}(manquant - optionnel)${RESET}`);
      totalWarnings++;
    }
    return false;
  }
}

// Fonction pour vérifier l'existence d'un dossier
function checkDir(dirPath, required = true) {
  const fullPath = path.join(process.cwd(), dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  
  if (exists) {
    console.log(`${GREEN}✅${RESET} ${dirPath}/`);
    return true;
  } else {
    if (required) {
      console.log(`${RED}❌${RESET} ${dirPath}/ ${RED}(DOSSIER MANQUANT)${RESET}`);
      totalIssues++;
    } else {
      console.log(`${YELLOW}⚠️ ${RESET} ${dirPath}/ ${YELLOW}(dossier manquant)${RESET}`);
      totalWarnings++;
    }
    return false;
  }
}

// 1. Fichiers racine
console.log(`\n${BLUE}📄 Fichiers racine:${RESET}`);
checkFile('index.js', true);
checkFile('server.js', true);
checkFile('package.json', true);
checkFile('.env', true);
checkFile('.env.example', false);
checkFile('.gitignore', false);
checkFile('README.md', false);

// 2. Dossier config
console.log(`\n${BLUE}⚙️  Configuration (config/):${RESET}`);
checkDir('config', true);
checkFile('config/index.js', true);

// 3. Dossier database
console.log(`\n${BLUE}🗄️  Base de données (database/):${RESET}`);
checkDir('database', true);
checkFile('database/db.js', true);
checkFile('database/migrate.js', true);
checkFile('database/schema.sql', false);

// 4. Dossier middlewares
console.log(`\n${BLUE}🔒 Middlewares (middlewares/):${RESET}`);
checkDir('middlewares', true);
checkFile('middlewares/auth.js', true);
checkFile('middlewares/validators.js', true);

// 5. Dossier utils
console.log(`\n${BLUE}🛠️  Utilitaires (utils/):${RESET}`);
checkDir('utils', true);
checkFile('utils/logger.js', true);

// 6. Dossier controllers
console.log(`\n${BLUE}🎮 Controllers (controllers/):${RESET}`);
checkDir('controllers', true);
checkFile('controllers/auth.controller.js', true);
checkFile('controllers/user.controller.js', true);
checkFile('controllers/restaurant.controller.js', true);
checkFile('controllers/order.controller.js', true);
checkFile('controllers/delivery.controller.js', true);
checkFile('controllers/admin.controller.js', true);

// 7. Dossier routes
console.log(`\n${BLUE}🛣️  Routes (routes/):${RESET}`);
checkDir('routes', true);
checkFile('routes/auth.routes.js', true);
checkFile('routes/user.routes.js', true);
checkFile('routes/restaurant.routes.js', true);
checkFile('routes/order.routes.js', true);
checkFile('routes/delivery.routes.js', true);
checkFile('routes/admin.routes.js', true);
checkFile('routes/webhook.routes.js', true);

// 8. Dossier services
console.log(`\n${BLUE}🔧 Services (services/):${RESET}`);
checkDir('services', true);
checkFile('services/auth.service.js', true);
checkFile('services/email.service.js', true);
checkFile('services/notification.service.js', true);
checkFile('services/sms.service.js', true);
checkFile('services/upload.service.js', true);

// 9. Dossier services/payment
console.log(`\n${BLUE}💳 Services de paiement (services/payment/):${RESET}`);
checkDir('services/payment', true);
checkFile('services/payment/orange-money.service.js', true);
checkFile('services/payment/mtn-momo.service.js', true);

// 10. Dossier jobs
console.log(`\n${BLUE}⏰ Tâches planifiées (jobs/):${RESET}`);
checkDir('jobs', true);
checkFile('jobs/cron.js', true);

// 11. Dossier logs
console.log(`\n${BLUE}📝 Logs (logs/):${RESET}`);
checkDir('logs', false);

// 12. node_modules
console.log(`\n${BLUE}📦 Dépendances:${RESET}`);
if (checkDir('node_modules', true)) {
  // Vérifier quelques dépendances critiques
  const criticalDeps = [
    'express',
    'pg',
    'jsonwebtoken',
    'bcrypt',
    'socket.io',
    'winston'
  ];
  
  console.log(`\n   ${BLUE}Vérification dépendances critiques:${RESET}`);
  criticalDeps.forEach(dep => {
    checkDir(`node_modules/${dep}`, true);
  });
}

// Résumé
console.log('\n' + '═'.repeat(60));
console.log(`\n${BLUE}📊 RÉSUMÉ:${RESET}\n`);

if (totalIssues === 0 && totalWarnings === 0) {
  console.log(`${GREEN}✅ Parfait! Tous les fichiers sont présents.${RESET}`);
  console.log(`${GREEN}   Le projet est prêt à démarrer!${RESET}\n`);
  console.log(`   Lancez: ${BLUE}npm run dev${RESET}\n`);
} else {
  if (totalIssues > 0) {
    console.log(`${RED}❌ ${totalIssues} fichier(s) requis manquant(s)${RESET}`);
  }
  if (totalWarnings > 0) {
    console.log(`${YELLOW}⚠️  ${totalWarnings} fichier(s) optionnel(s) manquant(s)${RESET}`);
  }
  
  console.log(`\n${YELLOW}🔧 Actions recommandées:${RESET}\n`);
  
  if (totalIssues > 0) {
    console.log(`   1. Vérifiez que tous les fichiers téléchargés sont bien placés`);
    console.log(`   2. Consultez CORRESPONDANCE_FICHIERS.md pour les emplacements`);
    console.log(`   3. Exécutez setup.sh pour automatiser le placement\n`);
  }
  
  if (!fs.existsSync('.env')) {
    console.log(`   ${YELLOW}⚠️  Créez .env:${RESET} cp .env.example .env`);
  }
  
  if (!fs.existsSync('node_modules')) {
    console.log(`   ${YELLOW}⚠️  Installez les dépendances:${RESET} npm install`);
  }
}

console.log('═'.repeat(60) + '\n');

// Code de sortie
process.exit(totalIssues > 0 ? 1 : 0);