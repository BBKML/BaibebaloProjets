import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';

const REQUIRED_DOCUMENTS = [
  {
    id: 'rccm',
    label: 'Registre de commerce (RCCM)',
    description: 'Photo claire de votre document RCCM',
    required: true,
  },
  {
    id: 'id_card_front',
    label: 'Carte d\'identité du gérant (Recto)',
    description: 'Photo de la face avant de votre CNI ou passeport',
    required: true,
  },
  {
    id: 'id_card_back',
    label: 'Carte d\'identité du gérant (Verso)',
    description: 'Photo de la face arrière de votre CNI ou passeport',
    required: true,
  },
];

export default function RegisterStep3Screen({ navigation, route }) {
  const step1Data = route.params?.step1Data || {};
  const step2Data = route.params?.step2Data || {};
  
  const [documents, setDocuments] = useState({
    rccm: null,
    id_card_front: null,
    id_card_back: null,
  });
  const [errors, setErrors] = useState({});
  const insets = useSafeAreaInsets();

  const pickImage = async (docId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Accès à la galerie nécessaire');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      const assets = result?.assets || [];
      
      if (!result?.canceled && assets.length > 0) {
        setDocuments((prev) => ({
          ...prev,
          [docId]: assets[0],
        }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[docId];
          return newErrors;
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeDocument = (docId) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: null,
    }));
  };

  const validate = () => {
    const newErrors = {};
    REQUIRED_DOCUMENTS.forEach((doc) => {
      if (doc.required && !documents[doc.id]) {
        newErrors[doc.id] = 'Document requis';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      navigation.navigate('RegisterStep4', {
        step1Data,
        step2Data,
        step3Data: documents,
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.stepText}>Étape 3 sur 4</Text>
        </View>

        {/* Indicateur de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={styles.progressStep} />
        </View>

        <Text style={styles.description}>
          Ces documents sont nécessaires pour valider votre inscription. Ils restent confidentiels.
        </Text>

        <View style={styles.form}>
          {REQUIRED_DOCUMENTS.map((doc) => {
            const hasDocument = !!documents[doc.id];
            const hasError = !!errors[doc.id];

            return (
              <View key={doc.id} style={styles.documentContainer}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentLabel}>
                    {doc.label} *
                  </Text>
                  <Text style={styles.documentDescription}>{doc.description}</Text>
                </View>

                {hasDocument ? (
                  <View style={styles.documentPreview}>
                    <Image
                      source={{ uri: documents[doc.id].uri }}
                      style={styles.documentImage}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeDocument(doc.id)}
                    >
                      <Ionicons name="close-circle" size={28} color={COLORS.error} />
                    </TouchableOpacity>
                    <View style={styles.successBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      <Text style={styles.successText}>Ajouté</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadButton, hasError && styles.uploadButtonError]}
                    onPress={() => pickImage(doc.id)}
                  >
                    <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.uploadButtonText}>Ajouter la photo</Text>
                  </TouchableOpacity>
                )}

                {hasError && (
                  <Text style={styles.errorText}>{errors[doc.id]}</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: COLORS.primary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  documentContainer: {
    marginBottom: 24,
  },
  documentHeader: {
    marginBottom: 12,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonError: {
    borderColor: COLORS.error,
  },
  uploadButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  documentPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  successBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  successText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
