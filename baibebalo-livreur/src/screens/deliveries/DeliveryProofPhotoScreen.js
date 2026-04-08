import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { uploadDocument } from '../../api/delivery';
import { parseUploadResponse } from './deliveryProofUtils';

export default function DeliveryProofPhotoScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const uploadDoneRef = useRef(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra pour prendre la preuve de livraison.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
  };

  const uploadAndContinue = async () => {
    if (!photoUri || !delivery || uploading || uploadDoneRef.current) return;
    const uri = typeof photoUri === 'string' ? photoUri : null;
    if (!uri) {
      Alert.alert('Erreur', 'Photo invalide. Reprenez la photo.');
      return;
    }
    uploadDoneRef.current = true;
    setUploading(true);
    try {
      const filename = uri.split('/').pop() || `proof_${Date.now()}.jpg`;
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: mimeType });
      formData.append('document_type', 'delivery_proof');
      const res = await uploadDocument(formData);
      const photoUrl = parseUploadResponse(res);
      if (photoUrl) {
        navigation.replace('ConfirmationCode', { delivery, photoUrl });
      } else {
        navigation.replace('ConfirmationCode', { delivery });
      }
    } catch (err) {
      const message = err?.message || (err?.response?.data?.error?.message) || 'Erreur réseau ou serveur';
      console.error('Upload preuve livraison:', err);
      uploadDoneRef.current = false;
      Alert.alert(
        'Upload échoué',
        `La photo n'a pas pu être envoyée. ${message}. Continuer sans photo ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Sans photo', onPress: () => navigation.replace('ConfirmationCode', { delivery }) },
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  const skipPhoto = () => {
    if (delivery) navigation.replace('ConfirmationCode', { delivery });
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={uploading}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Photo preuve</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            <Text style={styles.message}>Photo enregistrée. Envoyez-la puis saisissez le code client.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, uploading && styles.buttonDisabled]}
              onPress={uploadAndContinue}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>ENVOYER ET CONTINUER</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto} disabled={uploading}>
              <Text style={styles.secondaryButtonText}>Reprendre une photo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="camera" size={64} color={COLORS.primary} />
            <Text style={styles.message}>Prenez une photo de la livraison (optionnel)</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
              <Text style={styles.primaryButtonText}>PRENDRE UNE PHOTO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={skipPhoto}>
              <Text style={styles.skipButtonText}>Passer cette étape</Text>
            </TouchableOpacity>
          </>
        )}
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    maxWidth: 320,
    height: 240,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { marginTop: 16 },
  secondaryButtonText: { fontSize: 14, color: COLORS.primary },
  skipButton: { marginTop: 24 },
  skipButtonText: { fontSize: 14, color: COLORS.textSecondary },
});
