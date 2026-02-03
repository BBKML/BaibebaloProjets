/**
 * Test direct de l'API de connexion
 * Usage: node test-api-login.js
 */

const axios = require('axios');

async function testLogin() {
  try {
    const API_URL = 'http://localhost:5000/api/v1/auth/partner/login';
    
    const credentials = {
      email: 'restaurant@test.com',
      password: 'Test123!',
    };

    console.log('🔍 Test de connexion API...\n');
    console.log('URL:', API_URL);
    console.log('Credentials:', credentials);
    console.log('');

    const response = await axios.post(API_URL, credentials, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    console.log('✅ Connexion réussie !');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ Erreur de connexion');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Message:', error.message);
    
    if (error.response?.data) {
      console.log('\n💡 Message d\'erreur:', error.response.data.error?.message);
    }
  }
}

testLogin();
