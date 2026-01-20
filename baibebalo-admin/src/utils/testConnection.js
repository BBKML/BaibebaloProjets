/**
 * Utilitaire pour tester la connexion au backend
 */
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Test de connexion au backend...');
    
    // Test 1: Vérifier que le backend répond
    const response = await fetch('http://localhost:5000/api/v1/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Statut:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur backend:', errorData);
      return {
        success: false,
        status: response.status,
        error: errorData,
      };
    }
    
    const data = await response.json();
    console.log('✅ Connexion réussie:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
