/**
 * Utilitaire pour tester la connexion au backend
 */
export const testBackendConnection = async () => {
  const results = {
    backendReachable: false,
    healthCheck: false,
    apiEndpoint: false,
    error: null,
  };

  try {
    // Test 1: Vérifier que le backend répond
    // Essayer d'abord le port 5000, puis 3000
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    const healthURL = `http://localhost:${backendPort}/health`;
    console.log(`🔍 Test 1: Vérifier ${healthURL}`);
    const healthResponse = await fetch(healthURL);
    results.backendReachable = healthResponse.ok;
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend accessible:', healthData);
      results.healthCheck = true;
    } else {
      console.error('❌ Backend répond mais avec erreur:', healthResponse.status);
    }
  } catch (error) {
    console.error('❌ Backend non accessible:', error.message);
    results.error = error.message;
    return results;
  }

  try {
    // Test 2: Vérifier l'endpoint API (sans token)
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    const apiURL = `http://localhost:${backendPort}/api/v1/auth/admin/login`;
    console.log(`🔍 Test 2: Vérifier ${apiURL}`);
    const apiResponse = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test', password: 'test' }),
    });
    
    // On s'attend à une erreur 401 ou 400, pas 500
    if (apiResponse.status === 401 || apiResponse.status === 400) {
      results.apiEndpoint = true;
      console.log('✅ Endpoint API accessible (erreur attendue:', apiResponse.status, ')');
    } else if (apiResponse.status === 500) {
      console.error('❌ Erreur 500 sur l\'endpoint API - Problème côté serveur');
      const errorData = await apiResponse.json().catch(() => ({}));
      console.error('Détails:', errorData);
    } else {
      console.warn('⚠️ Statut inattendu:', apiResponse.status);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }

  return results;
};

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.testBackend = testBackendConnection;
}
