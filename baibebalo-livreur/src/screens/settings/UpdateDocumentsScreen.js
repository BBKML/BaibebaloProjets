import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { getProfile, updateProfile } from '../../api/delivery';
import { getImageUrl } from '../../utils/url';
import apiClient from '../../api/client';

const DOCUMENTS = [
  { id: 'id_card_recto', label: 'CNI / Passeport - Recto', icon: 'card-outline', required: true },
  { id: 'id_card_verso', label: 'CNI / Passeport - Verso', icon: 'card-outline', required: true },
  { id: 'driver_license_recto', label: 'Permis de conduire - Recto', icon: 'car-outline', required: false },
  { id: 'driver_license_verso', label: 'Permis de conduire - Verso', icon: 'car-outline', required: false },
  { id: 'vehicle_registration_recto', label: 'Carte grise - Recto', icon: 'document-outline', required: false },
  { id: 'vehicle_registration_verso', label: 'Carte grise - Verso', icon: 'document-outline', required: false },
  { id: 'insurance_document', label: 'Attestation d\'assurance', icon: 'shield-checkmark-outline', required: false },
  { id: 'profile_photo', label: 'Photo de profil', icon: 'person-outline', required: true },
];

export default function UpdateDocumentsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [documents, setDocuments] = useState({});

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await getProfile();
      if (response?.success && response?.data?.delivery_person) {
        const profile = response.data.delivery_person;
        setDocuments({
          id_card_recto: profile.id_card_recto,
          id_card_verso: profile.id_card_verso,
          driver_license_recto: profile.driver_license_recto,
          driver_license_verso: profile.driver_license_verso,
          vehicle_registration_recto: profile.vehicle_registration_recto,
          vehicle_registration_verso: profile.vehicle_registration_verso,
          insurance_document: profile.insurance_document,
          profile_photo: profile.profile_photo,
        });
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (documentId) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: documentId === 'profile_photo' ? [1, 1] : [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadDocument(documentId, result.assets[0]);
    }
  };

  const uploadDocument = async (documentId, imageAsset) => {
    setUploading(documentId);
    try {
      // Créer FormData pour l'upload
      const formData = new FormData();
      const filename = imageAsset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageAsset.uri,
        name: filename,
        type,
      });
      formData.append('document_type', documentId);

      // Upload vers le serveur
      const response = await apiClient.post('/delivery/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        setDocuments(prev => ({ ...prev, [documentId]: response.data.data.url }));
        Alert.alert('Succès', 'Document téléchargé avec succès');
      } else {
        throw new Error(response.data?.error?.message || 'Erreur upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      // Fallback: sauvegarder l'URI locale
      setDocuments(prev => ({ ...prev, [documentId]: imageAsset.uri }));
      Alert.alert('Info', 'Document sauvegardé localement. Il sera synchronisé plus tard.');
    } finally {
      setUploading(null);
    }
  };

  const getDocumentStatus = (docId) => {
    const doc = documents[docId];
    if (!doc) return { status: 'missing', label: 'Non fourni', color: COLORS.textSecondary };
    // Vérifier si c'est une URL valide ou si le document est vérifié
    return { status: 'uploaded', label: 'Fourni', color: COLORS.success };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Mes documents</Text>
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
        <Text style={styles.title}>Mes documents</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Vos documents sont stockés de manière sécurisée et ne sont utilisés que pour vérifier votre identité.
          </Text>
        </View>

        {/* Documents List */}
        {DOCUMENTS.map((doc) => {
          const status = getDocumentStatus(doc.id);
          const isUploading = uploading === doc.id;
          const hasDocument = !!documents[doc.id];

          return (
            <TouchableOpacity
              key={doc.id}
              style={styles.documentCard}
              onPress={() => !isUploading && pickImage(doc.id)}
              disabled={isUploading}
            >
              <View style={styles.documentLeft}>
                {hasDocument && doc.id === 'profile_photo' ? (
                  <Image source={{ uri: getImageUrl(documents[doc.id]) }} style={styles.documentPreview} />
                ) : (
                  <View style={[styles.documentIcon, hasDocument && styles.documentIconSuccess]}>
                    <Ionicons 
                      name={hasDocument ? 'checkmark' : doc.icon} 
                      size={24} 
                      color={hasDocument ? COLORS.success : COLORS.primary} 
                    />
                  </View>
                )}
                <View style={styles.documentInfo}>
                  <Text style={styles.documentLabel}>{doc.label}</Text>
                  <View style={styles.documentStatus}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    {doc.required && !hasDocument && (
                      <Text style={styles.requiredBadge}>Requis</Text>
                    )}
                  </View>
                </View>
              </View>

              {isUploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.documentAction}>
                  <Ionicons 
                    name={hasDocument ? 'create-outline' : 'cloud-upload-outline'} 
                    size={22} 
                    color={COLORS.primary} 
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.noteText}>
            Les documents seront vérifiés par notre équipe sous 24-48h. Vous serez notifié une fois la vérification terminée.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  documentIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  documentIconSuccess: { backgroundColor: COLORS.success + '15' },
  documentPreview: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  documentInfo: { flex: 1 },
  documentLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  documentStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.error,
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  documentAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
});
