import apiClient from './client';

const driversAPI = {
  // Lister les livreurs
  getDrivers: async (params = {}) => {
    const { page = 1, limit = 20, status, search } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const response = await apiClient.get(`/admin/delivery-persons?${queryParams}`);
    return response.data;
  },

  // Obtenir un livreur par ID
  getDriverById: async (id) => {
    const response = await apiClient.get(`/admin/delivery-persons/${id}`);
    return response.data;
  },

  // Créer un livreur
  createDriver: async (driverData) => {
    const response = await apiClient.post('/admin/delivery-persons', driverData);
    return response.data;
  },

  // Modifier un livreur
  updateDriver: async (id, driverData) => {
    const response = await apiClient.put(`/admin/delivery-persons/${id}`, driverData);
    return response.data;
  },

  // Supprimer un livreur
  deleteDriver: async (id) => {
    const response = await apiClient.delete(`/admin/delivery-persons/${id}`);
    return response.data;
  },

  // Approuver un livreur
  approveDriver: async (id) => {
    const response = await apiClient.put(`/admin/delivery-persons/${id}/approve`);
    return response.data;
  },

  // Rejeter un livreur
  rejectDriver: async (id, reason) => {
    const response = await apiClient.put(`/admin/delivery-persons/${id}/reject`, { reason });
    return response.data;
  },

  // Suspendre un livreur
  suspendDriver: async (id, reason) => {
    const response = await apiClient.put(`/admin/delivery-persons/${id}/suspend`, { reason });
    return response.data;
  },
};

export default driversAPI;
