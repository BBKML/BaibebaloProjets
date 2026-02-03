import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function RestaurantClosedScreen({ navigation, route }) {
  const { restaurant, onBack } = route.params || {};

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BAIBEBALO</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {(restaurant?.banner || restaurant?.logo || restaurant?.image_url) && (
        <Image source={{ uri: restaurant.banner || restaurant.logo || restaurant.image_url }} style={styles.heroImage} />
      )}

      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.bannerTitle}>Ce restaurant est actuellement fermé.</Text>
        </View>
        <Text style={styles.bannerSubtitle}>
          Réouverture à {restaurant?.opening_hours || '18h00'}.
        </Text>
        <TouchableOpacity>
          <Text style={styles.bannerLink}>Voir les horaires</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <Image
          source={{ uri: restaurant?.logo || restaurant?.logo_url || restaurant?.banner || restaurant?.image_url }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{restaurant?.name || 'BAIBEBALO'}</Text>
          <Text style={styles.profileMeta}>
            {restaurant?.cuisine_type || 'Ivorian Fusion'} • {restaurant?.rating || '4.8'}★
          </Text>
          <Text style={styles.profileMeta}>Livraison en 30-45 min</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {['Grillades', 'Spécialités', 'Accompagnements', 'Boissons'].map((chip) => (
          <View key={chip} style={chip === 'Grillades' ? styles.chipActive : styles.chip}>
            <Text style={chip === 'Grillades' ? styles.chipTextActive : styles.chipText}>
              {chip}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.closedMenu}>
        <Text style={styles.sectionTitle}>Populaire</Text>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.menuItem}>
            <View style={styles.menuImage} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Plat indisponible</Text>
              <Text style={styles.menuSubtitle}>Ce plat sera disponible à la réouverture.</Text>
              <Text style={styles.menuPrice}>2 500 FCFA</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.notifyButton}>
        <Ionicons name="notifications" size={18} color={COLORS.white} />
        <Text style={styles.notifyText}>Me prévenir quand c'est ouvert</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  banner: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '10',
    borderWidth: 1,
    borderColor: COLORS.warning + '20',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  bannerLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  profileCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  closedMenu: {
    margin: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.7,
  },
  menuImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  menuPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notifyButton: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  notifyText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
