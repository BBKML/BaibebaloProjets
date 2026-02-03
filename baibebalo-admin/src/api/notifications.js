import api from './client';

const notificationsAPI = {
  // Envoyer une notification à un utilisateur
  sendToUser: async (userId, userType, title, message, type = 'admin', data = {}) => {
    const response = await api.post('/admin/notifications/send', {
      user_id: userId,
      user_type: userType,
      title,
      message,
      type,
      data,
    });
    return response.data;
  },

  // Envoyer une notification à plusieurs utilisateurs
  broadcast: async (userIds, userType, title, message, type = 'admin', data = {}) => {
    const response = await api.post('/admin/notifications/broadcast', {
      user_ids: userIds,
      user_type: userType,
      title,
      message,
      type,
      data,
    });
    return response.data;
  },

  // Envoyer une notification promotionnelle
  sendPromotional: async (title, message, options = {}) => {
    const response = await api.post('/admin/notifications/promotional', {
      title,
      message,
      promo_code: options.promoCode,
      target_segment: options.segment, // 'all', 'new', 'active', 'inactive'
      data: options.data || {},
    });
    return response.data;
  },
};

export default notificationsAPI;
