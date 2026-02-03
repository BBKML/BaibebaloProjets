import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.topSpacer} />
      <View style={styles.brandContainer}>
        <View style={styles.logoCard}>
          <View style={styles.logoInner}>
            <Ionicons name="bicycle" size={48} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.title}>BAIBEBALO</Text>
        <Text style={styles.tagline}>KORHOGO</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={COLORS.white} />
          <Text style={styles.loaderText}>Initialisation</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>© 2026 BAIBEBALO Inc.</Text>
          <Text style={styles.metaText}>v1.0.0-stable</Text>
        </View>
      </View>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  topSpacer: {
    height: 20,
  },
  brandContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  logoInner: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 8,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  loaderText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  meta: {
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
