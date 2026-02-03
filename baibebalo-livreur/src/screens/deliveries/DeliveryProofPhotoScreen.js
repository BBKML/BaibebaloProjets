import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function DeliveryProofPhotoScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Photo preuve</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Ionicons name="camera" size={64} color={COLORS.primary} />
        <Text style={styles.message}>Prenez une photo de la livraison</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>PRENDRE UNE PHOTO</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, marginBottom: 32 },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
