# 🎯 BAIBEBALO Admin Dashboard

Application web React pour la gestion de la plateforme BAIBEBALO.

## 🚀 Démarrage Rapide

### Installation

```bash
npm install
```

### Configuration

Assurez-vous que le backend est démarré sur `http://localhost:5000`.

### Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

## 📁 Structure du Projet

```
src/
├── api/              # Clients API (Axios)
├── components/       # Composants React
│   ├── common/      # Composants réutilisables
│   ├── layout/      # Layout (Sidebar, Header)
│   └── dashboard/   # Composants dashboard
├── pages/           # Pages de l'application
├── utils/           # Utilitaires (format, constants)
└── styles/          # Styles globaux
```

## 🔐 Authentification

Compte admin par défaut:
- Email: `admin@baibebalo.ci`
- Password: `admin123`

## 🎨 Design System

- **Couleur primaire:** Bleu #0ea5e9
- **Logo:** Orange #FF6B35
- **Framework CSS:** Tailwind CSS

## 📦 Technologies

- React 19
- Vite
- React Router v7
- React Query (TanStack Query)
- Axios
- Tailwind CSS
- Recharts (graphiques)
- React Hot Toast (notifications)

## 🔗 API Backend

Le frontend communique avec le backend via `/api/v1`.

Le proxy est configuré dans `vite.config.js` pour rediriger `/api` vers `http://localhost:5000`.
