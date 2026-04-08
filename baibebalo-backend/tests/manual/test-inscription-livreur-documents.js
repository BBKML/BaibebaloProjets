/**
 * Test : inscription complète d'un livreur + upload de tous les documents.
 * Prérequis : backend démarré, base de données accessible.
 * Usage : node tests/manual/test-inscription-livreur-documents.js
 *         (optionnel) API_URL=http://192.168.1.13:5000/api/v1 node tests/manual/test-inscription-livreur-documents.js
 */

const axios = require('axios');
const { query } = require('../../src/database/db');

const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const PHONE = process.env.TEST_PHONE || '+2250799900001';

// Image JPEG minimale (1x1 pixel) en base64 pour les uploads
const MIN_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A0p//2Q==';

const DOCUMENT_TYPES = [
  'cni_recto', 'cni_verso', 'permis_recto', 'permis_verso',
  'carte_grise_recto', 'carte_grise_verso', 'assurance', 'photo_moto',
  'profile_photo',
];

function log(msg, ok = null) {
  const prefix = ok === true ? '✅' : ok === false ? '❌' : 'ℹ️';
  console.log(`${prefix} ${msg}`);
}

async function getOtpCode(phone) {
  const r = await query(
    "SELECT code FROM otp_codes WHERE phone = $1 AND is_used = false ORDER BY created_at DESC LIMIT 1",
    [phone]
  );
  if (r.rows.length === 0) {
    const r2 = await query(
      "SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1",
      [phone]
    );
    return r2.rows[0]?.code;
  }
  return r.rows[0].code;
}

async function run() {
  console.log('\n=== TEST INSCRIPTION LIVREUR + DOCUMENTS ===\n');
  console.log('API:', API_URL);
  console.log('Téléphone:', PHONE);

  try {
    log('1. Envoi OTP...');
    await axios.post(`${API_URL}/auth/send-otp`, { phone: PHONE, role: 'delivery' });
    log('   OTP envoyé', true);

    const code = await getOtpCode(PHONE);
    if (!code) {
      log('   Code OTP introuvable en base. Vérifiez les logs backend.', false);
      process.exit(1);
    }
    log(`   Code OTP (base): ${code}`, true);

    log('2. Vérification OTP (role: delivery)...');
    const verifyRes = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone: PHONE,
      code,
      role: 'delivery',
    });

    if (verifyRes.data.data?.isNewUser !== true) {
      log('   Ce numéro est déjà inscrit. Utilisez TEST_PHONE=+2250799900002 (ou autre) pour un nouveau.', false);
      process.exit(1);
    }
    log('   OTP OK, nouvel utilisateur', true);

    const payload = {
      phone: PHONE,
      first_name: 'Test',
      last_name: 'LivreurDocuments',
      vehicle_type: 'moto',
      vehicle_plate: 'AB 9999 CI',
      availability: {
        schedule: {
          Lundi: { morning: true, afternoon: true, evening: true },
          Mardi: { morning: true, afternoon: true, evening: true },
          Mercredi: { morning: true, afternoon: true, evening: true },
          Jeudi: { morning: true, afternoon: true, evening: true },
          Vendredi: { morning: true, afternoon: true, evening: true },
          Samedi: { morning: true, afternoon: true, evening: true },
          Dimanche: { morning: true, afternoon: true, evening: true },
        },
        flexible: true,
      },
      mobile_money_number: PHONE,
      mobile_money_provider: 'mtn_money',
    };

    log('3. Inscription (POST /delivery/register)...');
    const registerRes = await axios.post(`${API_URL}/delivery/register`, payload);
    const data = registerRes.data?.data;
    const token = data?.accessToken || data?.token;

    if (!registerRes.data?.success || !data?.delivery_person) {
      log('   Inscription échouée: ' + (registerRes.data?.message || registerRes.data?.error?.message), false);
      process.exit(1);
    }
    log('   Inscription réussie', true);

    if (!token) {
      log('   Pas de token dans la réponse (backend doit renvoyer accessToken après inscription).', false);
      console.log('Réponse reçue:', JSON.stringify(registerRes.data, null, 2));
      process.exit(1);
    }
    log('   Token reçu', true);

    const headers = { Authorization: `Bearer ${token}` };
    const photoBase64 = `data:image/jpeg;base64,${MIN_JPEG_BASE64}`;

    log('4. Upload des documents...');
    let ok = 0;
    let fail = 0;
    for (const docType of DOCUMENT_TYPES) {
      try {
        await axios.post(
          `${API_URL}/delivery/upload-document`,
          { document_type: docType, photo_base64: photoBase64 },
          { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        log(`   ${docType}`, true);
        ok++;
      } catch (err) {
        log(`   ${docType}: ${err.response?.data?.error?.message || err.message}`, false);
        fail++;
      }
    }

    console.log('\n--- Résumé ---');
    log(`Documents uploadés: ${ok}/${DOCUMENT_TYPES.length}`, fail === 0);
    log(`Livreur ID: ${data.delivery_person?.id}`);
    log(`Statut: ${data.delivery_person?.status}`);
    console.log('\nVérifiez dans l’admin (Livreurs > détail) que les documents apparaissent.\n');
    process.exit(fail > 0 ? 1 : 0);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    log('Erreur: ' + msg, false);
    if (err.response?.status) console.log('HTTP', err.response.status);
    if (err.response?.data) console.log(JSON.stringify(err.response.data, null, 2));
    if (err.code) console.log('Code:', err.code);
    process.exit(1);
  }
}

run();
