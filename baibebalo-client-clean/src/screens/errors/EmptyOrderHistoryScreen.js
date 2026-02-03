import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function EmptyOrderHistoryScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textLight} />
        </View>
        <Text style={styles.title}>Aucune commande</Text>
        <Text style={styles.subtitle}>
          Vous n'avez pas encore passé de commande. Parcourez nos restaurants et découvrez de délicieux plats !
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.exploreButtonText}>Explorer les restaurants</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});