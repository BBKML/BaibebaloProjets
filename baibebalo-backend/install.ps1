# Script d'installation BAIBEBALO Backend pour Windows
# Exécutez ce script dans PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BAIBEBALO Backend - Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
Write-Host "1. Vérification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✓ Node.js installé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Node.js non trouvé!" -ForegroundColor Red
    Write-Host "   Téléchargez Node.js depuis: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Vérifier PostgreSQL
Write-Host ""
Write-Host "2. Vérification de PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "   ✓ PostgreSQL installé: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ PostgreSQL non trouvé!" -ForegroundColor Red
    Write-Host "   Téléchargez PostgreSQL depuis: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "   Vous pouvez continuer et installer PostgreSQL plus tard." -ForegroundColor Yellow
}

# Installer les dépendances NPM
Write-Host ""
Write-Host "3. Installation des dépendances NPM..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Dépendances installées avec succès" -ForegroundColor Green
} else {
    Write-Host "   ✗ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}

# Créer le fichier .env
Write-Host ""
Write-Host "4. Configuration de l'environnement..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "   ✓ Fichier .env créé" -ForegroundColor Green
    Write-Host "   ⚠  N'oubliez pas de modifier .env avec vos paramètres!" -ForegroundColor Yellow
} else {
    Write-Host "   ℹ  Le fichier .env existe déjà" -ForegroundColor Blue
}

# Créer le dossier logs
Write-Host ""
Write-Host "5. Création des dossiers..." -ForegroundColor Yellow
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "   ✓ Dossier logs créé" -ForegroundColor Green
} else {
    Write-Host "   ℹ  Le dossier logs existe déjà" -ForegroundColor Blue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation terminée!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configurez PostgreSQL:" -ForegroundColor White
Write-Host "   - Ouvrez pgAdmin ou psql" -ForegroundColor Gray
Write-Host "   - Créez la base: CREATE DATABASE baibebalo;" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Modifiez le fichier .env:" -ForegroundColor White
Write-Host "   notepad .env" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Exécutez les migrations:" -ForegroundColor White
Write-Host "   npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Démarrez le serveur:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation complète: README.md" -ForegroundColor Cyan
Write-Host ""