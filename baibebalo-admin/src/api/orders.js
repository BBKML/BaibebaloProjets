import apiClient from './client';

export const ordersAPI = {
  // Obtenir toutes les commandes
  getOrders: async (params = {}) => {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  },

  // Obtenir les détails d'une commande
  getOrderDetails: async (id) => {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  // Mettre à jour le statut d'une commande
  updateOrderStatus: async (id, status) => {
    const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
    return response.data;
  },

  // Annuler une commande
  cancelOrder: async (id, reason) => {
    const response = await apiClient.put(`/admin/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // Réassigner un livreur à une commande
  reassignDeliveryPerson: async (id, deliveryPersonId) => {
    const response = await apiClient.put(`/admin/orders/${id}/assign-delivery`, { delivery_person_id: deliveryPersonId });
    return response.data;
  },

  // Obtenir les commandes problématiques
  getProblematicOrders: async (params = {}) => {
    const response = await apiClient.get('/admin/orders/problematic', { params });
    return response.data;
  },

  // Exporter les commandes (CSV, Excel, PDF)
  exportOrders: async (format, params = {}) => {
    const response = await apiClient.get('/admin/orders/export', {
      params: { format, ...params },
      responseType: 'blob', // Important pour télécharger les fichiers
    });
    
    // Créer un lien de téléchargement
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Déterminer le nom du fichier selon le format
    const date = new Date().toISOString().split('T')[0];
    const extensions = {
      csv: 'csv',
      excel: 'csv',
      xlsx: 'csv',
      pdf: 'pdf',
    };
    const extension = extensions[format.toLowerCase()] || 'csv';
    link.setAttribute('download', `commandes-${date}.${extension}`);
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  },
};
