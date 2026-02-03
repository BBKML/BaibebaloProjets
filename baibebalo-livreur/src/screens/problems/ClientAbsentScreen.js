import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ClientAbsentScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Client absent</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Ionicons name="person-remove" size={64} color={COLORS.warning} />
        <Text style={styles.message}>Procédure client absent</Text>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16 },
});
