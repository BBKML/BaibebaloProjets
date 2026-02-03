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

export default function ItemOutOfStockScreen({ navigation, route }) {
  const { item, onContinue } = route.params || {};

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.roundButton} onPress={handleContinue}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundButton}>
          <Ionicons name="share-social" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            source={{ uri: item?.image_url || 'https://via.placeholder.com/400' }}
            style={styles.heroImage}
          />
          <View style={styles.heroGradient} />
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Épuisé</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item?.name || 'Article indisponible'}</Text>
            <Text style={styles.price}>{item?.price || 4500} FCFA</Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star < 5 ? 'star' : 'star-half'}
                size={14}
                color={COLORS.warning}
              />
            ))}
            <Text style={styles.ratingText}>(120+ avis)</Text>
          </View>
          <Text style={styles.description}>
            Un délicieux plat traditionnel préparé avec des ingrédients frais du jour.
          </Text>

          <View style={styles.alertBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>Désolé, ce plat n'est plus disponible aujourd'hui.</Text>
              <Text style={styles.alertSubtitle}>
                Victime de son succès, il sera de retour dès demain matin.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.disabledButton} disabled>
            <Ionicons name="alert-circle" size={18} color={COLORS.white} />
            <Text style={styles.disabledButtonText}>Rupture de stock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.suggestions}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsTitle}>Vous aimerez aussi</Text>
            <Text style={styles.suggestionsLink}>Voir tout</Text>
          </View>
          {[1, 2, 3].map((suggestion) => (
            <View key={suggestion} style={styles.suggestionItem}>
              <View style={styles.suggestionImage} />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName}>Plat recommandé</Text>
                <Text style={styles.suggestionSub}>Restaurant partenaire</Text>
                <View style={styles.suggestionFooter}>
                  <Text style={styles.suggestionPrice}>2 500 FCFA</Text>
                  <View style={styles.addChip}>
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.border,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  card: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  alertBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.textSecondary + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  alertSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary + '60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestions: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  suggestionsLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  suggestionSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
