import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/client';

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Accident de la route', icon: 'car-outline', color: '#EF4444' },
  { id: 'vehicle_issue', label: 'Problème de véhicule', icon: 'construct-outline', color: '#F59E0B' },
  { id: 'customer_issue', label: 'Problème avec le client', icon: 'person-remove-outline', color: '#8B5CF6' },
  { id: 'restaurant_issue', label: 'Problème avec le restaurant', icon: 'restaurant-outline', color: '#3B82F6' },
  { id: 'package_damaged', label: 'Colis endommagé', icon: 'cube-outline', color: '#EC4899' },
  { id: 'address_issue', label: 'Adresse introuvable', icon: 'location-outline', color: '#10B981' },
  { id: 'security', label: 'Problème de sécurité', icon: 'shield-outline', color: '#EF4444' },
  { id: 'other', label: 'Autre incident', icon: 'alert-circle-outline', color: '#6B7280' },
];

export default function IncidentReportScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter au maximum 3 photos.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter au maximum 3 photos.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Type requis', 'Veuillez sélectionner un type d\'incident.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description requise', 'Veuillez décrire l\'incident.');
      return;
    }

    setSubmitting(true);

    try {
      const orderId = delivery?.id || delivery?.order_id;
      
      // Créer le rapport d'incident
      const response = await apiClient.post('/delivery/support/contact', {
        subject: `Incident: ${INCIDENT_TYPES.find(t => t.id === selectedType)?.label}`,
        message: `Type: ${selectedType}\n\nDescription: ${description}\n\nCommande: ${orderId || 'N/A'}`,
        order_id: orderId || undefined,
      });

      if (response.data?.success) {
        Alert.alert(
          'Incident signalé',
          'Votre rapport a été envoyé. Notre équipe vous contactera si nécessaire.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Erreur signalement incident:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'envoyer le rapport. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Signaler un incident</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Type d'incident */}
        <Text style={styles.sectionTitle}>Type d'incident *</Text>
        <View style={styles.typesGrid}>
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType === type.id && styles.typeCardSelected,
                selectedType === type.id && { borderColor: type.color },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon} size={24} color={type.color} />
              </View>
              <Text style={[
                styles.typeLabel,
                selectedType === type.id && styles.typeLabelSelected,
              ]}>
                {type.label}
              </Text>
              {selectedType === type.id && (
                <View style={[styles.checkmark, { backgroundColor: type.color }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Description *</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Décrivez l'incident en détail (lieu, circonstances, dommages éventuels...)"
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        {/* Photos */}
        <Text style={styles.sectionTitle}>Photos (optionnel)</Text>
        <Text style={styles.sectionHint}>Ajoutez jusqu'à 3 photos pour appuyer votre rapport</Text>
        
        <View style={styles.photosContainer}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          
          {photos.length < 3 && (
            <View style={styles.addPhotoButtons}>
              <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Infos commande si disponible */}
        {delivery && (
          <View style={styles.orderInfo}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.orderInfoText}>
              Commande liée : #{delivery.id || delivery.order_id || 'N/A'}
            </Text>
          </View>
        )}

        {/* Note urgence */}
        <View style={styles.urgencyNote}>
          <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
          <Text style={styles.urgencyText}>
            En cas d'urgence médicale ou de danger immédiat, appelez les secours (SAMU: 185, Police: 17).
          </Text>
        </View>
      </ScrollView>

      {/* Bouton envoyer */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (!selectedType || !description.trim() || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType || !description.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>ENVOYER LE RAPPORT</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.background, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeCardSelected: {
    backgroundColor: COLORS.primary + '08',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  typeLabelSelected: {
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  descriptionInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  orderInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.warning + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  urgencyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  
  bottomContainer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
