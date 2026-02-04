import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getImageUrl } from '../../utils/url';

const documents = [
  { id: 'cni_recto', label: 'CNI / Passeport - Recto', icon: 'card-outline' },
  { id: 'cni_verso', label: 'CNI / Passeport - Verso', icon: 'card-outline' },
  { id: 'certificat_residence', label: 'Certificat de résidence', icon: 'home-outline' },
  { id: 'photo_recente', label: 'Photo récente (fond neutre)', icon: 'person-outline' },
];

export default function DocumentUploadVeloScreen({ navigation }) {
  const { updateRegistrationData, registrationData } = useAuthStore();
  const [uploadedDocs, setUploadedDocs] = useState(registrationData.documents || {});
  const [uploading, setUploading] = useState(null);

  const pickImage = async (docId) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la galerie');
      return;
    }

    setUploading(docId);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    setUploading(null);

    if (!result.canceled) {
      const newDocs = { ...uploadedDocs, [docId]: result.assets[0].uri };
      setUploadedDocs(newDocs);
      await updateRegistrationData({ documents: newDocs });
    }
  };

  const takePhoto = async (docId) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
      return;
    }

    setUploading(docId);

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    setUploading(null);

    if (!result.canceled) {
      const newDocs = { ...uploadedDocs, [docId]: result.assets[0].uri };
      setUploadedDocs(newDocs);
      await updateRegistrationData({ documents: newDocs });
    }
  };

  const showOptions = (docId) => {
    Alert.alert(
      'Ajouter un document',
      'Choisissez une option',
      [
        { text: 'Prendre une photo', onPress: () => takePhoto(docId) },
        { text: 'Choisir dans la galerie', onPress: () => pickImage(docId) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const isAllUploaded = () => {
    return documents.every(doc => uploadedDocs[doc.id]);
  };

  const uploadedCount = documents.filter(doc => uploadedDocs[doc.id]).length;

  const handleContinue = () => {
    if (!isAllUploaded()) {
      Alert.alert('Documents manquants', 'Veuillez uploader tous les documents requis');
      return;
    }
    navigation.navigate('MobileMoneySetup');
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
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepIndicator}>Étape 3/5</Text>
        <Text style={styles.title}>Documents obligatoires</Text>
        <Text style={styles.subtitle}>
          Livreur Vélo/Piéton - Uploadez tous les documents requis
        </Text>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(uploadedCount / documents.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {uploadedCount}/{documents.length} documents
          </Text>
        </View>

        {/* Documents List */}
        <View style={styles.documentsList}>
          {documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.documentCard,
                uploadedDocs[doc.id] && styles.documentCardUploaded
              ]}
              onPress={() => showOptions(doc.id)}
              disabled={uploading === doc.id}
            >
              {uploadedDocs[doc.id] ? (
                <Image 
                  source={{ uri: getImageUrl(uploadedDocs[doc.id]) || uploadedDocs[doc.id] }} 
                  style={styles.documentThumbnail}
                />
              ) : (
                <View style={styles.documentIconContainer}>
                  <Ionicons name={doc.icon} size={24} color={COLORS.primary} />
                </View>
              )}
              
              <View style={styles.documentContent}>
                <Text style={styles.documentLabel}>{doc.label}</Text>
                <Text style={styles.documentStatus}>
                  {uploadedDocs[doc.id] ? '✅ Uploadé' : 'En attente'}
                </Text>
              </View>

              {uploading === doc.id ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={[
                  styles.uploadButton,
                  uploadedDocs[doc.id] && styles.uploadButtonDone
                ]}>
                  <Ionicons 
                    name={uploadedDocs[doc.id] ? 'checkmark' : 'camera'} 
                    size={20} 
                    color={uploadedDocs[doc.id] ? '#FFFFFF' : COLORS.primary}
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !isAllUploaded() && styles.primaryButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!isAllUploaded()}
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
    marginBottom: 24,
  },
  progressBar: {
    marginBottom: 24,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentCardUploaded: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  documentContent: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  documentStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDone: {
    backgroundColor: COLORS.primary,
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
