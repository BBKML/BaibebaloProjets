const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testVerify() {
  try {
    console.log('=== TEST VERIFICATION OTP LIVREUR ===\n');
    
    const response = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone: '+2250787097996',
      code: '407067',
      role: 'delivery'
    });
    
    console.log('Succès:', response.data.success);
    console.log('Message:', response.data.message);
    console.log('\nDonnées complètes:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data?.token) {
      console.log('\n✅ TOKEN PRÉSENT - Le livreur peut se connecter !');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.response?.data || error.message);
    process.exit(1);
  }
}

testVerify();
