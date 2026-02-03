/**
 * Service de géolocalisation GRATUIT avec OpenStreetMap
 * Alternative gratuite à Google Maps
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class MapsService {
  constructor() {
    // OpenStreetMap Nominatim API (gratuit)
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    // OSRM pour itinéraires (gratuit)
    this.osrmBaseUrl = 'http://router.project-osrm.org';
  }

  /**
   * Geocoding: Convertir une adresse en coordonnées GPS
   * Utilise Nominatim (OpenStreetMap) - GRATUIT
   * 
   * @param {string} address - Adresse textuelle
   * @param {string} city - Ville (optionnel, défaut: Korhogo)
   * @returns {Promise<Object>} {latitude, longitude, address}
   */
  async geocode(address, city = 'Korhogo') {
    try {
      const fullAddress = city ? `${address}, ${city}, Côte d'Ivoire` : `${address}, Côte d'Ivoire`;
      
      logger.debug('Geocoding avec OpenStreetMap', { address: fullAddress });

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: {
          q: fullAddress,
          format: 'json',
          limit: 1,
          countrycodes: 'ci', // Côte d'Ivoire
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'BAIBEBALO/1.0 (contact@baibebalo.ci)', // Requis par Nominatim
        },
        timeout: 5000, // 5 secondes max
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const geocodeResult = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: result.display_name,
          district: result.address?.suburb || result.address?.neighbourhood || null,
          city: result.address?.city || result.address?.town || city,
        };

        logger.info('Geocoding réussi', { 
          address: fullAddress,
          coordinates: `${geocodeResult.latitude}, ${geocodeResult.longitude}` 
        });

        return geocodeResult;
      }

      logger.warn('Aucun résultat geocoding', { address: fullAddress });
      return null;

    } catch (error) {
      logger.error('Erreur geocoding OpenStreetMap', { 
        error: error.message,
        address 
      });
      
      // Ne pas faire échouer l'application, retourner null
      return null;
    }
  }

  /**
   * Reverse Geocoding: Convertir coordonnées GPS en adresse
   * 
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} {address, district, city}
   */
  async reverseGeocode(latitude, longitude) {
    try {
      logger.debug('Reverse geocoding', { latitude, longitude });

      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'BAIBEBALO/1.0 (contact@baibebalo.ci)',
        },
        timeout: 5000,
      });

      if (response.data) {
        return {
          address: response.data.display_name,
          district: response.data.address?.suburb || response.data.address?.neighbourhood || null,
          city: response.data.address?.city || response.data.address?.town || 'Korhogo',
        };
      }

      return null;

    } catch (error) {
      logger.error('Erreur reverse geocoding', { error: error.message });
      return null;
    }
  }

  /**
   * Calculer la distance entre deux points (formule Haversine)
   * 100% gratuit, calcul local
   * 
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance en kilomètres
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en km

    return Math.round(distance * 100) / 100; // 2 décimales
  }

  /**
   * Convertir degrés en radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtenir un itinéraire entre deux points
   * Utilise OSRM (Open Source Routing Machine) - GRATUIT
   * 
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {Promise<Object>} {distance (km), duration (minutes), geometry}
   */
  async getRoute(lat1, lon1, lat2, lon2) {
    try {
      logger.debug('Calcul itinéraire avec OSRM', { 
        from: `${lat1}, ${lon1}`,
        to: `${lat2}, ${lon2}`
      });

      const response = await axios.get(
        `${this.osrmBaseUrl}/route/v1/driving/${lon1},${lat1};${lon2},${lat2}`,
        {
          params: {
            overview: 'full',
            geometries: 'geojson',
            steps: false,
          },
          timeout: 10000, // 10 secondes
        }
      );

      if (response.data && response.data.code === 'Ok' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distance: Math.round((route.distance / 1000) * 100) / 100, // en km, 2 décimales
          duration: Math.round(route.duration / 60), // en minutes
          geometry: route.geometry,
        };
      }

      // Si OSRM échoue, utiliser calcul simple
      logger.warn('OSRM échoué, utilisation calcul simple', { lat1, lon1, lat2, lon2 });
      return this.getSimpleRoute(lat1, lon1, lat2, lon2);

    } catch (error) {
      logger.error('Erreur calcul itinéraire OSRM', { 
        error: error.message,
        fallback: 'Utilisation calcul simple'
      });
      
      // Fallback: calcul simple
      return this.getSimpleRoute(lat1, lon1, lat2, lon2);
    }
  }

  /**
   * Calcul simple d'itinéraire (fallback si OSRM échoue)
   * Estimation basée sur la distance
   */
  getSimpleRoute(lat1, lon1, lat2, lon2) {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    // Estimation du temps de trajet: vitesse moyenne 15 km/h en ville (moto)
    // (Distance / 15) × 60 = minutes
    const duration = Math.round((distance / 15) * 60);
    
    return {
      distance,
      duration,
      geometry: null, // Pas de géométrie avec calcul simple
    };
  }

  /**
   * Calculer le temps de livraison estimé complet
   * Formule: Temps préparation + Temps trajet + Marge de sécurité
   * 
   * Temps trajet = (Distance en km ÷ 15) × 60 = minutes
   * Vitesse moyenne en ville: 15 km/h (moto)
   * Marge de sécurité: 5 minutes
   * 
   * @param {number} distance - Distance en km
   * @param {number} preparationTime - Temps de préparation en minutes (défaut: 20)
   * @returns {Object} { min: number, max: number, estimated: number }
   */
  calculateEstimatedDeliveryTime(distance, preparationTime = 20) {
    const avgSpeedKmH = 15; // Vitesse moyenne moto en ville
    const safetyMargin = 5; // Marge de sécurité en minutes
    
    // Temps de trajet = (Distance / 15) × 60
    const travelTime = Math.round((distance / avgSpeedKmH) * 60);
    
    // Temps total = Préparation + Trajet + Marge
    const estimatedTime = preparationTime + travelTime + safetyMargin;
    
    // Fourchette: -5 min / +5 min autour de l'estimation
    const minTime = Math.max(estimatedTime - 5, preparationTime + 5);
    const maxTime = estimatedTime + 5;
    
    return {
      min: minTime,
      max: maxTime,
      estimated: estimatedTime,
      breakdown: {
        preparation: preparationTime,
        travel: travelTime,
        margin: safetyMargin,
      },
    };
  }

  /**
   * Vérifier si une adresse est dans le rayon de livraison
   * 
   * @param {number} restaurantLat 
   * @param {number} restaurantLon 
   * @param {number} deliveryLat 
   * @param {number} deliveryLon 
   * @param {number} maxRadius - Rayon maximum en km (défaut: 10)
   * @returns {boolean}
   */
  isWithinDeliveryRadius(restaurantLat, restaurantLon, deliveryLat, deliveryLon, maxRadius = 10) {
    const distance = this.calculateDistance(restaurantLat, restaurantLon, deliveryLat, deliveryLon);
    return distance <= maxRadius;
  }

  /**
   * Calculer les frais de livraison basés sur la distance
   * Grille tarifaire:
   * - Distance < 2 km :    300 FCFA (livraison très proche)
   * - Distance 2-3 km :    500 FCFA (livraison proche)
   * - Distance 3-5 km :    700 FCFA (livraison moyenne)
   * - Distance 5-8 km :   1000 FCFA (livraison longue)
   * - Distance > 8 km :   1500 FCFA (livraison très longue)
   * 
   * @param {number} distance - Distance en km
   * @returns {number} Frais en FCFA
   */
  calculateDeliveryFee(distance) {
    // Grille tarifaire par paliers de distance
    if (distance < 2) {
      return 300;  // Livraison très proche
    } else if (distance < 3) {
      return 500;  // Livraison proche
    } else if (distance < 5) {
      return 700;  // Livraison moyenne
    } else if (distance < 8) {
      return 1000; // Livraison longue
    } else {
      return 1500; // Livraison très longue
    }
  }
  
  /**
   * Obtenir la description du tarif de livraison
   * @param {number} distance - Distance en km
   * @returns {Object} { fee, label, description }
   */
  getDeliveryFeeDetails(distance) {
    const fee = this.calculateDeliveryFee(distance);
    let label, description;
    
    if (distance < 2) {
      label = 'Très proche';
      description = 'Livraison très proche (< 2 km)';
    } else if (distance < 3) {
      label = 'Proche';
      description = 'Livraison proche (2-3 km)';
    } else if (distance < 5) {
      label = 'Moyenne';
      description = 'Livraison moyenne (3-5 km)';
    } else if (distance < 8) {
      label = 'Longue';
      description = 'Livraison longue (5-8 km)';
    } else {
      label = 'Très longue';
      description = 'Livraison très longue (> 8 km)';
    }
    
    return { fee, label, description, distance_km: Math.round(distance * 10) / 10 };
  }

  /**
   * Obtenir plusieurs restaurants proches d'un point
   * 
   * @param {number} lat 
   * @param {number} lon 
   * @param {Array} restaurants - Liste de restaurants avec lat/lon
   * @param {number} maxDistance - Distance max en km
   * @returns {Array} Restaurants triés par distance
   */
  getNearbyRestaurants(lat, lon, restaurants, maxDistance = 10) {
    return restaurants
      .map(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return null;
        
        const distance = this.calculateDistance(
          lat, lon,
          restaurant.latitude,
          restaurant.longitude
        );

        if (distance <= maxDistance) {
          return {
            ...restaurant,
            distance: Math.round(distance * 100) / 100,
            deliveryFee: this.calculateDeliveryFee(distance),
          };
        }
        return null;
      })
      .filter(r => r !== null)
      .sort((a, b) => a.distance - b.distance);
  }
}

module.exports = new MapsService();
