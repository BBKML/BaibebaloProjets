import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function OrderConfirmationScreen({ route, navigation }) {
  const { orderId, orderNumber, estimatedTime } = route.params || {};
  const displayOrderNumber = orderNumber || 'BAIB-12345';
  const displayEstimatedTime = estimatedTime || '12:45';

  const handleViewOrder = () => {
    if (!orderId) {
      Alert.alert('Commande', 'Identifiant de commande manquant.', [
        {
          text: 'Voir mes commandes',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Orders' } }],
            });
          },
        },
      ]);
      return;
    }
    navigation.replace('OrderTracking', { orderId });
  };

  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
    });
  };

  const handleShareWhatsApp = async () => {
    try {
      const message = `Ma commande BAIBEBALO #${displayOrderNumber} est confirmée ✅`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
      Alert.alert('WhatsApp', 'Impossible d\'ouvrir WhatsApp sur cet appareil.');
    } catch (error) {
      Alert.alert('WhatsApp', 'Une erreur est survenue lors du partage.');
      console.error('Erreur partage WhatsApp:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

        <View style={styles.iconContainer}>
          <View style={styles.iconGlow} />
          <View style={styles.iconBackground}>
            <Ionicons name="checkmark" size={48} color={COLORS.white} />
          </View>
        </View>

        <Text style={styles.title}>Commande confirmée !</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            ID DE COMMANDE #{displayOrderNumber}
          </Text>
        </View>

        <View style={styles.messageBlock}>
          <Text style={styles.message}>Merci pour votre confiance !</Text>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.timeText}>
              Arrivée prévue à {displayEstimatedTime}
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <Image
            source={{
              uri:
                'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600',
            }}
            style={styles.mapImage}
          />
          <View style={styles.deliveryIndicator}>
            <View style={styles.deliveryDot} />
            <Text style={styles.deliveryText}>Livreur en route</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrder}>
            <Ionicons name="car-outline" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Suivre ma commande</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.secondaryButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.supportLink} onPress={() => navigation.navigate('ContactSupport')}>
          <Text style={styles.supportText}>
            Un problème avec votre commande ? Contactez le support
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareLink} onPress={handleShareWhatsApp}>
          <Text style={styles.shareText}>Partager sur WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

OrderConfirmationScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      orderId: PropTypes.string,
      orderNumber: PropTypes.string,
      estimatedTime: PropTypes.string,
    }),
  }),
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    replace: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: COLORS.white,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primary + '15',
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  messageBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapContainer: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  deliveryIndicator: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  deliveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  supportLink: {
    marginTop: 16,
  },
  supportText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  shareLink: {
    marginTop: 10,
  },
  shareText: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
});
