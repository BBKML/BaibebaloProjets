import apiClient from './client';

export const authAPI = {
  // Connexion admin
  login: async (email, password) => {
    const response = await apiClient.post('/auth/admin/login', {
      email,
      password,
    });
    return response.data;
  },

  // Rafraîchir le token
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh-token', {
      refreshToken,
    });
    return response.data;
  },

  // Déconnexion (côté client uniquement)
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('admin');
  },

  // Changer le mot de passe
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put('/admin/account/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Mettre à jour l'email
  updateEmail: async (newEmail) => {
    const response = await apiClient.put('/admin/account/update-email', {
      newEmail,
    });
    return response.data;
  },

  // Obtenir les sessions actives
  getActiveSessions: async () => {
    const response = await apiClient.get('/admin/account/sessions');
    return response.data;
  },

  // Révoquer une session
  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/admin/account/sessions/${sessionId}`);
    return response.data;
  },

  // Déconnexion de tous les appareils
  logoutAll: async () => {
    const response = await apiClient.post('/admin/account/logout-all');
    return response.data;
  },

  // Supprimer le compte
  deleteAccount: async (password) => {
    const response = await apiClient.delete('/admin/account', {
      data: { password },
    });
    return response.data;
  },

  // Upload photo de profil
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    // Ne pas définir Content-Type manuellement pour FormData
    // Axios le définira automatiquement avec le bon boundary
    const response = await apiClient.post('/admin/account/profile-picture', formData);
    return response.data;
  },

  // Supprimer photo de profil
  deleteProfilePicture: async () => {
    const response = await apiClient.delete('/admin/account/profile-picture');
    return response.data;
  },

  // Demander la réinitialisation du mot de passe (mot de passe oublié)
  forgotPassword: async (email) => {
    // TODO: Implémenter l'endpoint backend
    // const response = await apiClient.post('/auth/admin/forgot-password', { email });
    // return response.data;
    
    // Pour l'instant, retourner une promesse simulée
    return Promise.resolve({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation par email.',
    });
  },
};
