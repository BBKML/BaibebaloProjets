import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

const vehicleTypes = [
  {
    id: 'moto',
    icon: 'bicycle',
    title: 'Moto',
    description: 'Livraisons rapides, plus de courses',
    documents: 'CNI, Permis A, Carte grise, Assurance',
    badge: 'Prioritaire',
    badgeColor: COLORS.warning,
  },
  {
    id: 'bike',
    icon: 'bicycle-outline',
    title: 'Vélo',
    description: 'Écologique, zones urbaines',
    documents: 'CNI, Certificat résidence',
    badge: null,
  },
  {
    id: 'foot',
    icon: 'walk',
    title: 'À pied',
    description: 'Zones limitées, courtes distances',
    documents: 'CNI, Certificat résidence',
    badge: null,
  },
];

export default function VehicleSelectionScreen({ navigation }) {
  const { updateRegistrationData, registrationData } = useAuthStore();
  const [selectedVehicle, setSelectedVehicle] = useState(registrationData.vehicleType || null);

  const handleContinue = async () => {
    if (!selectedVehicle) return;

    await updateRegistrationData({ vehicleType: selectedVehicle });

    if (selectedVehicle === 'moto') {
      navigation.navigate('DocumentUploadMoto');
    } else {
      // bike ou foot
      navigation.navigate('DocumentUploadVelo');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepIndicator}>Étape 2/5</Text>
        <Text style={styles.title}>Quel est votre moyen de transport?</Text>
        <Text style={styles.subtitle}>
          Sélectionnez le type de véhicule que vous utiliserez pour les livraisons
        </Text>

        {/* Vehicle Options */}
        <View style={styles.vehicleList}>
          {vehicleTypes.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.vehicleCardSelected
              ]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              {/* Badge */}
              {vehicle.badge && (
                <View style={[styles.badge, { backgroundColor: vehicle.badgeColor }]}>
                  <Text style={styles.badgeText}>{vehicle.badge}</Text>
                </View>
              )}

              {/* Selection indicator */}
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedVehicle === vehicle.id && styles.radioSelected
                ]}>
                  {selectedVehicle === vehicle.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>

              {/* Icon */}
              <View style={[
                styles.vehicleIcon,
                selectedVehicle === vehicle.id && styles.vehicleIconSelected
              ]}>
                <Ionicons 
                  name={vehicle.icon} 
                  size={32} 
                  color={selectedVehicle === vehicle.id ? '#FFFFFF' : COLORS.primary} 
                />
              </View>

              {/* Content */}
              <View style={styles.vehicleContent}>
                <Text style={styles.vehicleTitle}>{vehicle.title}</Text>
                <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                <View style={styles.documentsContainer}>
                  <Ionicons name="document-text-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.documentsText}>Documents: {vehicle.documents}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !selectedVehicle && styles.primaryButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedVehicle}
        >
          <Text style={styles.primaryButtonText}>CONTINUER</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  vehicleList: {
    gap: 16,
  },
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 4,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  vehicleIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  vehicleIconSelected: {
    backgroundColor: COLORS.primary,
  },
  vehicleContent: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  documentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
