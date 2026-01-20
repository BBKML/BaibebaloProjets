import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getLoyaltyPoints } from '../../api/users';

export default function LoyaltyDashboardScreen({ navigation }) {
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const response = await getLoyaltyPoints();
      // Le backend peut retourner les points dans response.data.points ou response.data
      const points = response.data?.points || response.data?.total_points || response.data?.loyalty_points || 0;
      setLoyaltyPoints(points);
    } catch (error) {
      console.error('Erreur lors du chargement des points:', error);
      setLoyaltyPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      icon: 'gift-outline',
      label: 'Historique des points',
      onPress: () => navigation.navigate('PointsHistory'),
    },
    {
      icon: 'people-outline',
      label: 'Programme de parrainage',
      onPress: () => navigation.navigate('ReferralProgram'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header avec points */}
      <View style={styles.header}>
        <View style={styles.pointsCard}>
          <View style={styles.pointsIcon}>
            <Ionicons name="star" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.pointsLabel}>Vos points de fidélité</Text>
          <Text style={styles.pointsValue}>{loyaltyPoints}</Text>
          <Text style={styles.pointsSubtext}>
            {loyaltyPoints >= 1000
              ? `${Math.floor(loyaltyPoints / 1000)}k points`
              : `${loyaltyPoints} points`}
          </Text>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.info} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Comment gagner des points ?</Text>
            <Text style={styles.infoText}>
              Gagnez 10 points pour chaque 1000 FCFA dépensés. Utilisez vos points pour obtenir des réductions !
            </Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={24} color={COLORS.text} />
            <Text style={styles.menuItemText}>{item.label}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.primary,
  },
  pointsCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  pointsSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  infoSection: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  menuSection: {
    padding: 16,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
});
