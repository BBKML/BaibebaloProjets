const axios = require('axios');
const { query } = require('../src/database/db');

const API_BASE = 'http://localhost:5000/api/v1';

async function getAuthToken() {
  try {
    // 1. Envoyer OTP
    const phone = '+2250701234567';
    await axios.post(`${API_BASE}/auth/send-otp`, { phone });
    
    // 2. Récupérer le code OTP de la base de données
    const otpResult = await query(
      `SELECT code FROM otp_codes 
       WHERE phone = $1 AND is_used = false AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    
    if (otpResult.rows.length === 0) {
      console.log('⚠️  Aucun code OTP trouvé, utilisation du code par défaut: 123456');
      return null;
    }
    
    const otpCode = otpResult.rows[0].code;
    
    // 3. Vérifier OTP et obtenir le token
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      phone,
      code: otpCode,
      first_name: 'Test',
      last_name: 'User',
    });
    
    if (verifyResponse.data?.success && verifyResponse.data?.data?.accessToken) {
      return verifyResponse.data.data.accessToken;
    }
    
    return null;
  } catch (error) {
    console.log('⚠️  Impossible d\'obtenir un token, le test utilisera un token invalide');
    return null;
  }
}

async function testPaymentBlocked() {
  console.log('🧪 Test du blocage des méthodes de paiement Mobile Money...\n');
  
  // Obtenir un token valide
  console.log('📝 Obtention d\'un token d\'authentification...');
  const token = await getAuthToken();
  
  if (!token) {
    console.log('⚠️  Note : Le test va utiliser un token invalide');
    console.log('   La validation du paiement se fait APRÈS l\'authentification');
    console.log('   Pour un test complet, assurez-vous qu\'un utilisateur existe avec le numéro +2250701234567\n');
  }
  
  try {
    const response = await axios.post(`${API_BASE}/orders`, {
      payment_method: 'orange_money',
      items: [{ menu_item_id: 'test', quantity: 1 }]
    }, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : { 'Authorization': 'Bearer INVALID_TOKEN' }
    });
    
    console.log('❌ ERREUR : Mobile Money devrait être bloqué !');
    console.log('Réponse reçue :', response.data);
  } catch (error) {
    // Vérifier si c'est une erreur réseau (serveur non démarré)
    if (!error.response) {
      console.log('❌ ERREUR RÉSEAU : Le serveur ne répond pas');
      console.log('   Assurez-vous que le serveur backend est démarré sur http://localhost:5000');
      console.log('   Erreur :', error.message);
      return;
    }
    
    // Vérifier le code d'erreur attendu
    if (error.response?.data?.error?.code === 'PAYMENT_METHOD_DISABLED') {
      console.log('✅ TEST RÉUSSI : Mobile Money est bien bloqué');
      console.log('   Message :', error.response.data.error.message);
    } else if (error.response?.status === 401) {
      console.log('⚠️  Erreur d\'authentification (401)');
      console.log('   La validation du paiement se fait APRÈS l\'authentification');
      console.log('   Pour tester la validation, vous devez avoir un token valide');
      console.log('   Essayez d\'abord de créer un utilisateur avec le numéro +2250701234567');
      console.log('   Réponse :', error.response.data);
    } else {
      console.log('❌ Erreur inattendue :');
      console.log('   Status :', error.response.status);
      console.log('   Code erreur :', error.response?.data?.error?.code);
      console.log('   Message :', error.response?.data?.error?.message);
      console.log('   Données complètes :', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPaymentBlocked();
