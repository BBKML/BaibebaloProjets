const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
const PHONE = '+2250787097996';

async function testLogin() {
  try {
    console.log('=== TEST CONNEXION LIVREUR ===\n');
    
    // Étape 1: Envoyer OTP
    console.log('1. Envoi OTP...');
    const sendOtpResponse = await axios.post(`${API_URL}/auth/send-otp`, {
      phone: PHONE,
      role: 'delivery'
    });
    console.log('   OTP envoyé:', sendOtpResponse.data.success);
    
    // Récupérer l'OTP depuis la base
    const { query } = require('./src/database/db');
    const otpResult = await query(
      'SELECT code FROM otp_codes WHERE phone = $1 AND used = false ORDER BY created_at DESC LIMIT 1',
      [PHONE]
    );
    
    if (otpResult.rows.length === 0) {
      console.log('   ❌ Aucun OTP trouvé dans la base');
      process.exit(1);
    }
    
    const otpCode = otpResult.rows[0].code;
    console.log('   OTP récupéré:', otpCode);
    
    // Étape 2: Vérifier OTP avec role=delivery
    console.log('\n2. Vérification OTP (role: delivery)...');
    const verifyResponse = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone: PHONE,
      code: otpCode,
      role: 'delivery'
    });
    
    console.log('   Succès:', verifyResponse.data.success);
    console.log('   Message:', verifyResponse.data.message);
    
    if (verifyResponse.data.data) {
      const data = verifyResponse.data.data;
      console.log('\n3. Données reçues:');
      console.log('   - User ID:', data.user?.id);
      console.log('   - Phone:', data.user?.phone);
      console.log('   - Nom:', data.user?.first_name, data.user?.last_name);
      console.log('   - Status:', data.user?.status);
      console.log('   - Vehicle:', data.user?.vehicle_type);
      console.log('   - Token présent:', !!data.token || !!data.accessToken);
      console.log('   - isNewUser:', data.isNewUser);
      
      if (data.token || data.accessToken) {
        console.log('\n✅ CONNEXION RÉUSSIE !');
        console.log('   Le livreur peut accéder à l\'application.');
      } else if (data.needsValidation) {
        console.log('\n⏳ COMPTE EN ATTENTE DE VALIDATION');
      } else if (data.isNewUser) {
        console.log('\n📝 NOUVEAU LIVREUR - doit compléter l\'inscription');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.response?.data || error.message);
    process.exit(1);
  }
}

testLogin();
