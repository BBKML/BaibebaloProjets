import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      
      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="bicycle" size={64} color="#FFFFFF" />
        </View>
        
        {/* App name */}
        <Text style={styles.appName}>BAIBEBALO</Text>
        
        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>LIVREUR</Text>
        </View>
      </View>
      
      {/* Bottom loading */}
      <View style={styles.bottomContent}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
        <Text style={styles.versionText}>v1.0 MVP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  bottomContent: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
});
