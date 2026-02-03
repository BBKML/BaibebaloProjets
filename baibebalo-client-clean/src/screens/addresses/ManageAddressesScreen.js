import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getAddresses, deleteAddress } from '../../api/users';

export default function ManageAddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddresses();
    const unsubscribe = navigation.addListener('focus', loadAddresses);
    return unsubscribe;
  }, [navigation]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await getAddresses();
      setAddresses(response.data?.addresses || response.data?.data?.addresses || []);
    } catch (error) {
      console.error('Erreur lors du chargement des adresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (addressId) => {
    Alert.alert(
      'Supprimer l\'adresse',
      'Êtes-vous sûr de vouloir supprimer cette adresse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAddress(addressId);
                loadAddresses();
              } catch (error) {
                Alert.alert(
                  'Erreur',
                  error.response?.data?.error?.message || 'Erreur lors de la suppression'
                );
              }
            })();
          },
        },
      ]
    );
  };

  const handleEdit = (address) => {
    navigation.navigate('AddAddress', { address, isEdit: true });
  };

  const getIconName = (label) => {
    const normalized = label?.toLowerCase();
    if (normalized === 'maison' || normalized === 'home') return 'home';
    if (normalized === 'bureau' || normalized === 'work') return 'briefcase-outline';
    return 'heart-outline';
  };

  const renderAddress = ({ item }) => {
    const iconName = getIconName(item.label);

    return (
      <View style={styles.addressCard}>
        <View style={styles.addressIcon}>
          <Ionicons
            name={iconName}
            size={24}
            color={item.is_default ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        <View style={styles.addressInfo}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressLabel}>{item.label || 'Adresse'}</Text>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Par défaut</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressText}>
            {[item.street, item.city].filter(Boolean).join(', ')}
          </Text>
          <View style={styles.addressActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={[styles.actionButtonText, { color: COLORS.error }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes adresses</Text>
        <View style={styles.headerSpacer} />
      </View>

      {addresses.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Aucune adresse</Text>
          <Text style={styles.emptySubtext}>
            Ajoutez votre première adresse pour commencer
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddress}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadAddresses} />
          }
        />
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAddress', { fromCheckout: false })}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Ajouter une nouvelle adresse</Text>
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 140, // Espace pour les boutons + safe area
  },
  addressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  defaultBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
