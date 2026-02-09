const axios = require('axios');
const config = require('../src/config');

const NEXAH_API_KEY = config.sms.nexah.apiKey;
const NEXAH_SENDER_ID = config.sms.nexah.senderId || 'BAIBEBALO';
const NEXAH_ENDPOINT = config.sms.nexah.endpoint || 'https://api.nexah.net/api/v1/sms/send';

async function testNexahSMS() {
  console.log('🧪 Test d\'envoi SMS via Nexah...\n');
  console.log('Configuration:');
  console.log(`  - API Key: ${NEXAH_API_KEY.substring(0, 20)}...`);
  console.log(`  - Sender ID: ${NEXAH_SENDER_ID}`);
  console.log(`  - Endpoint: ${NEXAH_ENDPOINT}\n`);

  // Numéro de test (remplacez par votre numéro)
  const testPhone = '+2250585670940'; // Votre numéro depuis le dashboard
  
  // Message de test
  const testMessage = 'Test BAIBEBALO - Votre code OTP est: 123456';

  try {
    console.log(`📱 Envoi d'un SMS de test à ${testPhone}...`);
    
    const response = await axios.post(
      NEXAH_ENDPOINT,
      {
        apiKey: NEXAH_API_KEY,
        from: NEXAH_SENDER_ID,
        to: testPhone,
        message: testMessage,
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('\n✅ SMS envoyé avec succès !');
    console.log('Réponse Nexah:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success === false) {
      console.log('\n⚠️  Attention: La réponse indique un échec');
      console.log('Message:', response.data.message);
    } else {
      console.log('\n🎉 Le SMS devrait arriver sur votre téléphone dans quelques secondes !');
      console.log(`📊 Vous avez maintenant ${5 - 1} SMS restants sur votre compte Nexah`);
    }

  } catch (error) {
    console.log('\n❌ Erreur lors de l\'envoi du SMS:');
    
    if (error.response) {
      // Erreur de l'API Nexah
      console.log('   Status:', error.response.status);
      console.log('   Données:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n⚠️  Erreur d\'authentification - Vérifiez votre clé API');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  Erreur de validation - Vérifiez le format du numéro et du message');
      }
    } else if (error.request) {
      // Pas de réponse du serveur
      console.log('   Le serveur Nexah ne répond pas');
      console.log('   Vérifiez votre connexion internet');
      console.log('   Erreur:', error.message);
    } else {
      // Erreur lors de la configuration de la requête
      console.log('   Erreur:', error.message);
    }
  }
}

// Vérifier que la clé API est configurée
if (!NEXAH_API_KEY || NEXAH_API_KEY === 'VOTRE_CLE_NEXAH_ICI' || NEXAH_API_KEY === 'your_nexah_api_key') {
  console.log('❌ ERREUR: Clé API Nexah non configurée !');
  console.log('   Vérifiez votre fichier .env et assurez-vous que NEXAH_API_KEY est défini');
  process.exit(1);
}

testNexahSMS();
