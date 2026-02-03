import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile, getProfile } from '../../api/delivery';

const WORK_ZONES_KEY = 'delivery_work_zones';

// Zones disponibles à Korhogo
const availableZones = [
  { id: 1, name: 'Centre-ville', latitude: 9.4580, longitude: -5.6294, radius: 1000, demandLevel: 'high' },
  { id: 2, name: 'Marché central', latitude: 9.4620, longitude: -5.6350, radius: 800, demandLevel: 'high' },
  { id: 3, name: 'Zone commerciale', latitude: 9.4540, longitude: -5.6200, radius: 900, demandLevel: 'medium' },
  { id: 4, name: 'Quartier résidentiel Nord', latitude: 9.4650, longitude: -5.6250, radius: 1200, demandLevel: 'low' },
  { id: 5, name: 'Quartier résidentiel Sud', latitude: 9.4500, longitude: -5.6400, radius: 1000, demandLevel: 'medium' },
  { id: 6, name: 'Zone industrielle', latitude: 9.4450, longitude: -5.6150, radius: 800, demandLevel: 'low' },
];

const demandColors = {
  high: { fill: 'rgba(255, 87, 51, 0.2)', stroke: '#FF5733', label: 'Forte demande' },
  medium: { fill: 'rgba(255, 193, 7, 0.2)', stroke: '#FFC107', label: 'Demande moyenne' },
  low: { fill: 'rgba(76, 175, 80, 0.2)', stroke: '#4CAF50', label: 'Faible demande' },
};

export default function WorkZonesScreen({ navigation }) {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedZones, setSelectedZones] = useState([1, 2, 3]); // Zones par défaut

  useEffect(() => {
    loadSavedZones();
  }, []);

  const loadSavedZones = async () => {
    try {
      // Essayer de charger depuis le backend
      const response = await getProfile();
      if (response?.success && response?.data?.delivery_person?.work_zones) {
        const rawData = response.data.delivery_person.work_zones;
        const zones = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (Array.isArray(zones) && zones.length > 0) {
          setSelectedZones(zones);
        }
      } else {
        // Fallback: charger depuis AsyncStorage
        const stored = await AsyncStorage.getItem(WORK_ZONES_KEY);
        if (stored) {
          const zones = JSON.parse(stored);
          if (Array.isArray(zones) && zones.length > 0) {
            setSelectedZones(zones);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZone = (zoneId) => {
    if (selectedZones.includes(zoneId)) {
      if (selectedZones.length === 1) {
        Alert.alert('Attention', 'Vous devez sélectionner au moins une zone de travail.');
        return;
      }
      setSelectedZones(selectedZones.filter(id => id !== zoneId));
    } else {
      setSelectedZones([...selectedZones, zoneId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sauvegarder localement
      await AsyncStorage.setItem(WORK_ZONES_KEY, JSON.stringify(selectedZones));
      
      // Sauvegarder sur le serveur
      await updateProfile({ work_zones: JSON.stringify(selectedZones) });
      
      Alert.alert(
        'Zones enregistrées',
        `Vous avez sélectionné ${selectedZones.length} zone(s) de travail.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erreur sauvegarde zones:', error);
      Alert.alert('Info', 'Zones sauvegardées localement');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const focusOnZone = (zone) => {
    mapRef.current?.animateToRegion({
      latitude: zone.latitude,
      longitude: zone.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Zones de travail</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Zones de travail</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Carte */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: 9.4580,
            longitude: -5.6294,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
        >
          {availableZones.map((zone) => (
            <React.Fragment key={zone.id}>
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radius}
                fillColor={selectedZones.includes(zone.id) 
                  ? demandColors[zone.demandLevel].fill 
                  : 'rgba(150, 150, 150, 0.1)'}
                strokeColor={selectedZones.includes(zone.id) 
                  ? demandColors[zone.demandLevel].stroke 
                  : '#999999'}
                strokeWidth={selectedZones.includes(zone.id) ? 3 : 1}
              />
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                onPress={() => toggleZone(zone.id)}
              >
                <View style={[
                  styles.zoneMarker,
                  selectedZones.includes(zone.id) && styles.zoneMarkerSelected,
                  { borderColor: demandColors[zone.demandLevel].stroke }
                ]}>
                  <Ionicons 
                    name={selectedZones.includes(zone.id) ? 'checkmark' : 'add'} 
                    size={16} 
                    color={selectedZones.includes(zone.id) ? COLORS.white : COLORS.textSecondary} 
                  />
                </View>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>

        {/* Légende */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: demandColors.high.stroke }]} />
            <Text style={styles.legendText}>Forte</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: demandColors.medium.stroke }]} />
            <Text style={styles.legendText}>Moyenne</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: demandColors.low.stroke }]} />
            <Text style={styles.legendText}>Faible</Text>
          </View>
        </View>
      </View>

      {/* Liste des zones */}
      <View style={styles.zonesSection}>
        <Text style={styles.sectionTitle}>
          Sélectionnez vos zones ({selectedZones.length} sélectionnée{selectedZones.length > 1 ? 's' : ''})
        </Text>
        <ScrollView style={styles.zonesList} showsVerticalScrollIndicator={false}>
          {availableZones.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={[
                styles.zoneItem,
                selectedZones.includes(zone.id) && styles.zoneItemSelected
              ]}
              onPress={() => toggleZone(zone.id)}
              onLongPress={() => focusOnZone(zone)}
            >
              <View style={styles.zoneItemLeft}>
                <View style={[
                  styles.zoneCheckbox,
                  selectedZones.includes(zone.id) && styles.zoneCheckboxSelected
                ]}>
                  {selectedZones.includes(zone.id) && (
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  )}
                </View>
                <View>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <View style={styles.zoneDemand}>
                    <Ionicons 
                      name={zone.demandLevel === 'high' ? 'flame' : zone.demandLevel === 'medium' ? 'trending-up' : 'remove'} 
                      size={12} 
                      color={demandColors[zone.demandLevel].stroke} 
                    />
                    <Text style={[styles.zoneDemandText, { color: demandColors[zone.demandLevel].stroke }]}>
                      {demandColors[zone.demandLevel].label}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => focusOnZone(zone)} style={styles.zoneLocateBtn}>
                <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  placeholder: { width: 80 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: {
    height: 280,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  zoneMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  zoneMarkerSelected: {
    backgroundColor: COLORS.primary,
  },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  zonesSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  zonesList: {
    flex: 1,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  zoneItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCheckboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  zoneDemand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  zoneDemandText: {
    fontSize: 11,
    fontWeight: '500',
  },
  zoneLocateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
