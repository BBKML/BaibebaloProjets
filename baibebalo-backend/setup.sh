#!/bin/bash

# Script d'installation automatique BAIBEBALO Backend
# Usage: chmod +x setup.sh && ./setup.sh

set -e  # Arrêter en cas d'erreur

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🚀 BAIBEBALO Backend - Installation automatique          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un message d'erreur
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher un avertissement
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour afficher une info
info() {
    echo -e "ℹ️  $1"
}

# Étape 1: Créer les dossiers
echo ""
info "Étape 1/5: Création des dossiers..."
mkdir -p config database middlewares utils logs
success "Dossiers créés"

# Étape 2: Renommer et déplacer les fichiers
echo ""
info "Étape 2/5: Déplacement des fichiers..."

# Config
if [ -f "config_index.js" ]; then
    mv config_index.js config/index.js
    success "config/index.js"
else
    warning "config_index.js non trouvé"
fi

# Database
if [ -f "database_db.js" ]; then
    mv database_db.js database/db.js
    success "database/db.js"
else
    warning "database_db.js non trouvé"
fi

if [ -f "database_migrate.js" ]; then
    mv database_migrate.js database/migrate.js
    success "database/migrate.js"
else
    warning "database_migrate.js non trouvé"
fi

# Middlewares
if [ -f "middlewares_auth.js" ]; then
    mv middlewares_auth.js middlewares/auth.js
    success "middlewares/auth.js"
else
    warning "middlewares_auth.js non trouvé"
fi

# Utils
if [ -f "utils_logger.js" ]; then
    mv utils_logger.js utils/logger.js
    success "utils/logger.js"
else
    warning "utils_logger.js non trouvé"
fi

# Fichiers racine
if [ -f "env_example.txt" ]; then
    mv env_example.txt .env.example
    success ".env.example"
else
    warning "env_example.txt non trouvé"
fi

if [ -f "gitignore.txt" ]; then
    mv gitignore.txt .gitignore
    success ".gitignore"
else
    warning "gitignore.txt non trouvé"
fi

# Étape 3: Créer .env
echo ""
info "Étape 3/5: Configuration .env..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        success ".env créé (à configurer!)"
        warning "N'oubliez pas de configurer .env avec vos vraies valeurs!"
    else
        error ".env.example introuvable, impossible de créer .env"
    fi
else
    info ".env existe déjà, pas de modification"
fi

# Étape 4: Installer les dépendances
echo ""
info "Étape 4/5: Installation des dépendances npm..."
if command -v npm &> /dev/null; then
    npm install
    success "Dépendances installées"
else
    error "npm n'est pas installé. Installez Node.js d'abord."
    exit 1
fi

# Étape 5: Vérifier PostgreSQL
echo ""
info "Étape 5/5: Vérification PostgreSQL..."
if command -v psql &> /dev/null; then
    success "PostgreSQL installé"
    
    # Proposer de créer la base de données
    echo ""
    read -p "Voulez-vous créer la base de données 'baibebalo'? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo -u postgres psql -c "CREATE DATABASE baibebalo;" 2>/dev/null || warning "Base de données existe déjà ou erreur"
        sudo -u postgres psql baibebalo -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
        sudo -u postgres psql baibebalo -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" 2>/dev/null
        sudo -u postgres psql baibebalo -c "CREATE EXTENSION IF NOT EXISTS \"cube\";" 2>/dev/null
        sudo -u postgres psql baibebalo -c "CREATE EXTENSION IF NOT EXISTS \"earthdistance\";" 2>/dev/null
        success "Base de données créée avec extensions"
        
        # Exécuter les migrations
        echo ""
        read -p "Voulez-vous exécuter les migrations maintenant? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run migrate
            success "Migrations exécutées"
        fi
    fi
else
    warning "PostgreSQL n'est pas installé"
    info "Installez PostgreSQL: sudo apt install postgresql postgresql-contrib"
fi

# Résumé final
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ Installation terminée!                                 ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Afficher la structure
info "Structure du projet:"
echo ""
tree -L 2 -I 'node_modules|logs' 2>/dev/null || ls -la

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "📝 Prochaines étapes:"
echo ""
echo "1. Éditer le fichier .env avec vos vraies configurations:"
echo "   nano .env"
echo ""
echo "2. Configurer au minimum:"
echo "   - DB_PASSWORD"
echo "   - JWT_SECRET"
echo "   - JWT_REFRESH_SECRET"
echo ""
echo "3. Si vous n'avez pas encore créé la DB:"
echo "   sudo -u postgres psql -c 'CREATE DATABASE baibebalo;'"
echo "   npm run migrate"
echo ""
echo "4. Démarrer le serveur:"
echo "   npm run dev"
echo ""
echo "5. Tester:"
echo "   curl http://localhost:3000/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

success "Installation complète! Bon développement 🚀"
echo ""
