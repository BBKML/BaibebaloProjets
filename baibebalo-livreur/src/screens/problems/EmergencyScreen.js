import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function EmergencyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Ionicons name="warning" size={80} color="#FFFFFF" />
        <Text style={styles.title}>Urgence</Text>
        <Text style={styles.message}>Sélectionnez le type de problème</Text>
        <View style={styles.options}>
          {['Accident', 'Panne', 'Sécurité', 'Santé', 'Autre'].map(opt => (
            <TouchableOpacity key={opt} style={styles.optionButton}>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.error },
  header: { flexDirection: 'row', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginTop: 24 },
  message: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8, marginBottom: 32 },
  options: { width: '100%', gap: 12 },
  optionButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 12, alignItems: 'center' },
  optionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
