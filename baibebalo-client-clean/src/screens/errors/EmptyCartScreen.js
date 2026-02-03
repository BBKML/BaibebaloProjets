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

export default function EmptyCartScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Panier</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.glow} />
          <View style={styles.circleOuter}>
            <View style={styles.circleInner}>
              <Ionicons name="basket-outline" size={64} color={COLORS.primary} />
            </View>
          </View>
          <View style={styles.floatingTop}>
            <Ionicons name="restaurant" size={18} color={COLORS.textSecondary} />
          </View>
          <View style={styles.floatingBottom}>
            <Ionicons name="pizza-outline" size={18} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.title}>Votre panier est vide</Text>
        <Text style={styles.subtitle}>
          Ajoutez de délicieux plats de nos meilleurs restaurants pour commencer.
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.exploreButtonText}>Voir le menu</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  illustration: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary + '10',
  },
  circleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  circleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTop: {
    position: 'absolute',
    top: 16,
    right: 24,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 12,
    transform: [{ rotate: '12deg' }],
  },
  floatingBottom: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    backgroundColor: COLORS.primary + '15',
    padding: 8,
    borderRadius: 12,
    transform: [{ rotate: '-12deg' }],
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exploreButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});