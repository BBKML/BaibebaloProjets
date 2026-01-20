/**
 * BAIBEBALO API - Routes de test
 * Fichier: src/routes/test.routes.js
 * 
 * Routes simples pour tester l'API avec POST, GET, PUT, DELETE
 */

const express = require('express');
const router = express.Router();

// ================================
// ROUTE GET - Liste des utilisateurs de test
// ================================
router.get('/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Kouadio Jean', email: 'kouadio@baibebalo.com', role: 'client' },
      { id: 2, name: 'Koné Fatima', email: 'kone@baibebalo.com', role: 'restaurant' },
      { id: 3, name: 'Yao Michel', email: 'yao@baibebalo.com', role: 'livreur' },
    ],
    message: 'Liste des utilisateurs récupérée avec succès',
  });
});

// ================================
// ROUTE POST - Créer un utilisateur
// ================================
router.post('/users', (req, res) => {
  const { name, email, phone, role } = req.body;

  // Validation simple
  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Les champs name, email et phone sont requis',
        fields: {
          name: !name ? 'Nom requis' : null,
          email: !email ? 'Email requis' : null,
          phone: !phone ? 'Téléphone requis' : null,
        },
      },
    });
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Format d\'email invalide',
      },
    });
  }

  // Créer l'utilisateur (simulation)
  const newUser = {
    id: Math.floor(Math.random() * 10000),
    name,
    email,
    phone,
    role: role || 'client',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: newUser,
    message: 'Utilisateur créé avec succès',
  });
});

// ================================
// ROUTE POST - Créer une commande
// ================================
router.post('/orders', (req, res) => {
  const { userId, restaurantId, items, deliveryAddress } = req.body;

  // Validation
  if (!userId || !restaurantId || !items || !deliveryAddress) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Tous les champs sont requis',
        required: ['userId', 'restaurantId', 'items', 'deliveryAddress'],
      },
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ITEMS',
        message: 'La commande doit contenir au moins un article',
      },
    });
  }

  // Calculer le total
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const deliveryFee = 1000; // 1000 FCFA
  const total = subtotal + deliveryFee;

  // Créer la commande
  const newOrder = {
    id: `ORD-${Date.now()}`,
    userId,
    restaurantId,
    items,
    deliveryAddress,
    subtotal,
    deliveryFee,
    total,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: newOrder,
    message: 'Commande créée avec succès',
  });
});

// ================================
// ROUTE POST - Authentification (Login)
// ================================
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email et mot de passe requis',
      },
    });
  }

  // Simulation de vérification (en production, vérifier en DB)
  if (email === 'test@baibebalo.com' && password === 'password123') {
    const token = 'fake-jwt-token-' + Date.now();
    
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          name: 'Utilisateur Test',
          email: 'test@baibebalo.com',
          role: 'client',
        },
        token,
        expiresIn: '7d',
      },
      message: 'Connexion réussie',
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      },
    });
  }
});

// ================================
// ROUTE POST - Inscription
// ================================
router.post('/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;

  // Validation
  const errors = {};
  
  if (!name) errors.name = 'Nom requis';
  if (!email) errors.email = 'Email requis';
  if (!phone) errors.phone = 'Téléphone requis';
  if (!password) errors.password = 'Mot de passe requis';
  
  if (password && password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erreurs de validation',
        fields: errors,
      },
    });
  }

  // Créer l'utilisateur
  const newUser = {
    id: Math.floor(Math.random() * 10000),
    name,
    email,
    phone,
    role: 'client',
    createdAt: new Date().toISOString(),
  };

  const token = 'fake-jwt-token-' + Date.now();

  res.status(201).json({
    success: true,
    data: {
      user: newUser,
      token,
      expiresIn: '7d',
    },
    message: 'Inscription réussie',
  });
});

// ================================
// ROUTE POST - Recherche de restaurants
// ================================
router.post('/restaurants/search', (req, res) => {
  const { query, category, isOpen, minRating } = req.body;

  // Restaurants de test
  const restaurants = [
    {
      id: 1,
      name: 'Restaurant Chez Maman',
      category: 'Ivoirien',
      cuisine: ['Attiéké', 'Garba', 'Alloco'],
      rating: 4.5,
      isOpen: true,
      deliveryTime: '30-45 min',
      minOrder: 2000,
    },
    {
      id: 2,
      name: 'Pizza Palace Korhogo',
      category: 'Fast Food',
      cuisine: ['Pizza', 'Burger', 'Frites'],
      rating: 4.2,
      isOpen: true,
      deliveryTime: '20-30 min',
      minOrder: 3000,
    },
    {
      id: 3,
      name: 'Le Tchèp Délice',
      category: 'Sénégalais',
      cuisine: ['Thiéboudienne', 'Yassa', 'Mafé'],
      rating: 4.7,
      isOpen: false,
      deliveryTime: '40-60 min',
      minOrder: 2500,
    },
  ];

  // Filtrer les résultats
  let results = restaurants;

  if (query) {
    results = results.filter(r => 
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.cuisine.some(c => c.toLowerCase().includes(query.toLowerCase()))
    );
  }

  if (category) {
    results = results.filter(r => r.category === category);
  }

  if (isOpen !== undefined) {
    results = results.filter(r => r.isOpen === isOpen);
  }

  if (minRating) {
    results = results.filter(r => r.rating >= minRating);
  }

  res.json({
    success: true,
    data: {
      restaurants: results,
      total: results.length,
      filters: { query, category, isOpen, minRating },
    },
    message: `${results.length} restaurant(s) trouvé(s)`,
  });
});

// ================================
// ROUTE PUT - Mettre à jour un utilisateur
// ================================
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;

  if (!name && !phone && !address) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_UPDATE_DATA',
        message: 'Aucune donnée à mettre à jour',
      },
    });
  }

  const updatedUser = {
    id: parseInt(id),
    name: name || 'Nom existant',
    phone: phone || '0709123456',
    address: address || 'Adresse existante',
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: updatedUser,
    message: 'Utilisateur mis à jour avec succès',
  });
});

// ================================
// ROUTE DELETE - Supprimer un utilisateur
// ================================
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    data: {
      id: parseInt(id),
      deleted: true,
      deletedAt: new Date().toISOString(),
    },
    message: 'Utilisateur supprimé avec succès',
  });
});

// ================================
// ROUTE POST - Calculer le prix de livraison
// ================================
router.post('/delivery/calculate', (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.body;

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_COORDINATES',
        message: 'Coordonnées GPS requises (fromLat, fromLng, toLat, toLng)',
      },
    });
  }

  // Calcul simplifié de distance (en km)
  const distance = Math.sqrt(
    Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2)
  ) * 111; // Approximation en km

  const pricePerKm = 200; // 200 FCFA par km
  const basePrice = 500; // Prix minimum
  const deliveryPrice = Math.max(basePrice, Math.round(distance * pricePerKm));
  const estimatedTime = Math.round(distance * 3 + 15); // 3 min par km + 15 min base

  res.json({
    success: true,
    data: {
      distance: Math.round(distance * 100) / 100, // 2 décimales
      deliveryPrice,
      estimatedTime: `${estimatedTime} min`,
      priceBreakdown: {
        basePrice,
        distancePrice: deliveryPrice - basePrice,
        total: deliveryPrice,
      },
    },
    message: 'Prix de livraison calculé',
  });
});

module.exports = router;