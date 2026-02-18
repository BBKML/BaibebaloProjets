import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getAddresses } from '../../api/users';

export default function AddressSelectionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(route?.params?.selectedAddressId || null);
  const [loading, setLoading] = useState(true);

  // Charger les adresses au montage ET quand l'écran revient au focus
  useEffect(() => {
    loadAddresses();
    
    // Écouter le retour au focus pour recharger les adresses
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📍 AddressSelection focused - reloading addresses');
      loadAddresses();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await getAddresses();
      console.log('📍 Adresses reçues:', response);
      const fetchedAddresses = response.data?.addresses || response.data?.data?.addresses || response.addresses || [];
      console.log('📍 Adresses parsées:', fetchedAddresses.length, 'adresse(s)');
      setAddresses(fetchedAddresses);
      if (fetchedAddresses.length > 0 && !selectedAddress) {
        setSelectedAddress(fetchedAddresses[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des adresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedAddress) {
      const onSelect = route?.params?.onSelect;
      const nextRouteName = route?.params?.nextRouteName;
      const returnTo = route?.params?.returnTo;
      const returnParamKey = route?.params?.returnParamKey;
      if (onSelect) {
        onSelect(selectedAddress);
        navigation.goBack();
        return;
      }
      if (returnTo && returnParamKey) {
        navigation.navigate(returnTo, { [returnParamKey]: selectedAddress });
        return;
      }
      if (nextRouteName) {
        navigation.navigate(nextRouteName, { selectedAddressId: selectedAddress });
        return;
      }
      navigation.goBack();
    }
  };

  const getAddressIcon = (label) => {
    const normalized = label?.toLowerCase();
    if (normalized === 'maison' || normalized === 'home') return 'home';
    if (normalized === 'bureau' || normalized === 'work') return 'briefcase-outline';
    return 'location-outline';
  };

  const renderAddress = ({ item }) => {
    const isSelected = selectedAddress === item.id;
    const addressLabel = item.label || 'Adresse';
    const addressText = [item.street, item.city].filter(Boolean).join(', ');
    
    return (
      <TouchableOpacity
        style={[styles.addressCard, isSelected && styles.addressCardSelected]}
        onPress={() => setSelectedAddress(item.id)}
      >
        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <Ionicons name={getAddressIcon(item.label)} size={18} color={COLORS.textSecondary} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressTitle}>{addressLabel}</Text>
            <Text style={styles.addressText}>{addressText}</Text>
          </View>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Étape 1 sur 3</Text>
          <Text style={styles.progressPercent}>33% Complété</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.heroTitle}>
          Où souhaitez-vous recevoir votre commande ?
        </Text>

        <TouchableOpacity
          style={styles.gpsCard}
          onPress={() => navigation.navigate('MapLocationSelector')}
        >
          <View style={styles.gpsIcon}>
            <Ionicons name="locate" size={22} color={COLORS.white} />
          </View>
          <View style={styles.gpsInfo}>
            <Text style={styles.gpsTitle}>Utiliser ma position actuelle</Text>
            <Text style={styles.gpsSubtitle}>Précision GPS élevée</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.savedHeader}>
          <Text style={styles.savedTitle}>Adresses enregistrées</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddAddress')}>
            <Text style={styles.savedAction}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement des adresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune adresse</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez une adresse pour continuer
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddAddress')}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Ajouter une adresse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContent}>
            {addresses.map((address) => (
              <View key={address.id}>{renderAddress({ item: address })}</View>
            ))}
          </View>
        )}

        <View style={styles.mapPreview}>
          <View style={styles.mapPin}>
            <Ionicons name="location" size={16} color={COLORS.white} />
          </View>
        </View>
      </ScrollView>

      {/* Footer toujours visible */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedAddress || addresses.length === 0) && styles.confirmButtonDisabled]}
          onPress={handleSelect}
          disabled={!selectedAddress || addresses.length === 0}
        >
          <Text style={styles.confirmButtonText}>
            {addresses.length === 0 ? 'Ajoutez une adresse' : 'Continuer'}
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  progressWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressPercent: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentInner: {
    paddingBottom: 140, // Espace pour le footer + safe area
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: 16,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: 24,
  },
  gpsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    opacity: 0.7,
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  savedAction: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    gap: 12,
  },
  addressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  addressInfo: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  mapPreview: {
    height: 160,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    marginTop: 24,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
