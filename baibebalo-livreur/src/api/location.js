import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// === Carte de chaleur ===
export const getHeatMap = async (latitude, longitude, radius = 10) => {
  const response = await apiClient.get(API_ENDPOINTS.LOCATION.HEAT_MAP, {
    params: { latitude, longitude, radius },
  });
  return response.data;
};

// === Restaurants à proximité ===
export const getNearbyRestaurants = async (latitude, longitude, radius = 5) => {
  const response = await apiClient.get(API_ENDPOINTS.LOCATION.NEARBY_RESTAURANTS, {
    params: { latitude, longitude, radius },
  });
  return response.data;
};

// === Zones suggérées ===
export const getSuggestedZones = async (latitude, longitude) => {
  const response = await apiClient.get(API_ENDPOINTS.LOCATION.SUGGESTED_ZONES, {
    params: { latitude, longitude },
  });
  return response.data;
};

export default {
  getHeatMap,
  getNearbyRestaurants,
  getSuggestedZones,
};
