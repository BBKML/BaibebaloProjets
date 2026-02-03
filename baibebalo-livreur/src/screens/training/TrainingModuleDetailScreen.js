import React from 'react';
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

export default function TrainingModuleDetailScreen({ navigation, route }) {
  const { moduleId } = route.params || { moduleId: 1 };

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
        <Text style={styles.headerTitle}>Module {moduleId}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Video placeholder */}
        <View style={styles.videoContainer}>
          <Ionicons name="play-circle" size={64} color="#FFFFFF" />
          <Text style={styles.videoText}>Contenu de formation</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Utilisation de l'application</Text>
          <Text style={styles.duration}>Durée: 10 minutes</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points clés</Text>
            <View style={styles.keyPoint}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.keyPointText}>Interface et navigation</Text>
            </View>
            <View style={styles.keyPoint}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.keyPointText}>Accepter/refuser une course</Text>
            </View>
            <View style={styles.keyPoint}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.keyPointText}>Utiliser le GPS</Text>
            </View>
            <View style={styles.keyPoint}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.keyPointText}>Marquer les étapes</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>MODULE TERMINÉ</Text>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  videoContainer: {
    height: 200,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  duration: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keyPointText: {
    fontSize: 14,
    color: COLORS.text,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
