import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantMenu } from '../../api/menu';

const BULK_ACTIONS = [
  { id: 'price', label: 'Modifier le prix', icon: 'cash' },
  { id: 'category', label: 'Changer de catégorie', icon: 'folder' },
  { id: 'status', label: 'Activer/Désactiver', icon: 'power' },
  { id: 'delete', label: 'Supprimer', icon: 'trash', destructive: true },
];

export default function BulkMenuEditScreen({ navigation }) {
  const { menu, categories, setMenu } = useRestaurantStore();
  const [selectedItems, setSelectedItems] = useState([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionValue, setActionValue] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === menu.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(menu.map((item) => item.id));
    }
  };

  const handleBulkAction = (action) => {
    console.log('📋 handleBulkAction appelé:', action.id, 'Items:', selectedItems.length);
    if (selectedItems.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un article');
      return;
    }
    setSelectedAction(action);
    // Réinitialiser actionValue selon l'action
    if (action.id === 'status') {
      // Pour le statut, initialiser avec le statut actuel du premier item sélectionné
      const firstItem = menu.find((item) => selectedItems.includes(item.id));
      setActionValue(firstItem?.is_available !== false ? 'active' : 'inactive');
    } else {
      setActionValue('');
    }
    console.log('📋 Ouverture du modal pour:', action.id);
    setShowActionModal(true);
  };

  const executeBulkAction = async () => {
    if (!selectedAction) {
      return;
    }
    
    setLoading(true);
    try {
      let updates = [];

      switch (selectedAction.id) {
        case 'price':
          const percentage = parseFloat(actionValue);
          if (isNaN(percentage) || !actionValue.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un pourcentage valide');
            setLoading(false);
            return;
          }
          updates = selectedItems.map((id) => {
            const item = menu.find((i) => i.id === id);
            if (!item) {
              return null;
            }
            const newPrice = Math.round(item.price * (1 + percentage / 100));
            return {
              id,
              price: newPrice,
            };
          }).filter(Boolean); // Retirer les null
          break;

        case 'category':
          if (!actionValue) {
            Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
            setLoading(false);
            return;
          }
          updates = selectedItems.map((id) => ({
            id,
            category_id: actionValue,
          }));
          break;

        case 'status':
          if (!actionValue || (actionValue !== 'active' && actionValue !== 'inactive')) {
            Alert.alert('Erreur', 'Veuillez sélectionner un statut');
            setLoading(false);
            return;
          }
          updates = selectedItems.map((id) => ({
            id,
            is_available: actionValue === 'active',
          }));
          break;

        case 'delete':
          Alert.alert(
            'Confirmation',
            `Êtes-vous sûr de vouloir supprimer ${selectedItems.length} article(s) ?`,
            [
              { 
                text: 'Annuler', 
                style: 'cancel',
                onPress: () => {
                  setLoading(false);
                }
              },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: async () => {
                  try {
                    setLoading(true);
                    await Promise.all(
                      selectedItems.map((id) => restaurantMenu.deleteItem(id))
                    );
                    // Recharger le menu depuis le backend
                    try {
                      const menuResponse = await restaurantMenu.getMenu();
                      if (menuResponse && menuResponse.data && menuResponse.data.menu) {
                        setMenu(menuResponse.data.menu);
                      } else if (menuResponse && menuResponse.menu) {
                        setMenu(menuResponse.menu);
                      } else {
                        setMenu(menu.filter((item) => !selectedItems.includes(item.id)));
                      }
                    } catch (menuError) {
                      // En cas d'erreur, utiliser le fallback local
                      setMenu(menu.filter((item) => !selectedItems.includes(item.id)));
                    }
                    setSelectedItems([]);
                    setShowActionModal(false);
                    Alert.alert('Succès', `${selectedItems.length} article(s) supprimé(s)`);
                  } catch (error) {
                    const errorMessage = error.error?.message || error.message || 'Erreur';
                    Alert.alert('Erreur', errorMessage);
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ]
          );
          return;
      }

      if (updates.length === 0) {
        setLoading(false);
        return;
      }

      await restaurantMenu.bulkUpdate(updates);
      
      // Recharger le menu depuis le backend pour avoir les données à jour
      try {
        const menuResponse = await restaurantMenu.getMenu();
        if (menuResponse && menuResponse.data && menuResponse.data.menu) {
          setMenu(menuResponse.data.menu);
        } else if (menuResponse && menuResponse.menu) {
          // Format alternatif
          setMenu(menuResponse.menu);
        } else {
        // Fallback : mettre à jour le store localement
        const updatedMenu = menu.map((item) => {
          const update = updates.find((u) => u.id === item.id);
          if (update) {
            return {
              ...item,
              price: update.price !== undefined ? update.price : item.price,
              category_id: update.category_id !== undefined ? update.category_id : item.category_id,
              is_available: update.is_available !== undefined ? update.is_available : item.is_available,
            };
          }
          return item;
        });
        setMenu(updatedMenu);
        }
      } catch (menuError) {
        // En cas d'erreur, utiliser le fallback local
        const updatedMenu = menu.map((item) => {
          const update = updates.find((u) => u.id === item.id);
          if (update) {
            return {
              ...item,
              price: update.price !== undefined ? update.price : item.price,
              category_id: update.category_id !== undefined ? update.category_id : item.category_id,
              is_available: update.is_available !== undefined ? update.is_available : item.is_available,
            };
          }
          return item;
        });
        setMenu(updatedMenu);
      }
      
      setSelectedItems([]);
      setShowActionModal(false);
      setActionValue('');
      Alert.alert('Succès', `${updates.length} article(s) modifié(s) avec succès`);
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Erreur lors de la mise à jour';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}
        onPress={() => toggleItemSelection(item.id)}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} FCFA</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion en masse</Text>
        <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
          <Text style={styles.selectAllText}>
            {selectedItems.length === menu.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          {selectedItems.length} article(s) sélectionné(s)
        </Text>
      </View>

      <FlatList
        data={menu}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.list,
          selectedItems.length > 0 && { paddingBottom: 100 } // Espace pour les boutons
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun article</Text>
          </View>
        }
      />

      {selectedItems.length > 0 && (
        <View style={styles.actionsBar}>
          {BULK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
                action.destructive && styles.actionButtonDestructive,
              ]}
              onPress={() => {
                console.log('🔘 Bouton cliqué:', action.id, 'Items sélectionnés:', selectedItems.length);
                handleBulkAction(action);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.destructive ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  action.destructive && styles.actionButtonTextDestructive,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Modal pour les actions */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedAction?.label}</Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedAction?.id === 'price' && (
                <>
                  <Text style={styles.modalLabel}>
                    Modifier le prix de {selectedItems.length} article(s)
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="+10 ou -20 (pourcentage)"
                    value={actionValue}
                    onChangeText={setActionValue}
                    keyboardType="numeric"
                  />
                  <Text style={styles.modalHint}>
                    Entrez un pourcentage positif (+) ou négatif (-)
                  </Text>
                </>
              )}

              {selectedAction?.id === 'category' && (
                <>
                  <Text style={styles.modalLabel}>Nouvelle catégorie</Text>
                  <View style={styles.categoryList}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryOption,
                          actionValue === cat.id.toString() && styles.categoryOptionSelected,
                        ]}
                        onPress={() => setActionValue(cat.id.toString())}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            actionValue === cat.id.toString() && styles.categoryOptionTextSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {selectedAction?.id === 'status' && (
                <>
                  <Text style={styles.modalLabel}>Statut</Text>
                  <View style={styles.statusOptions}>
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        actionValue === 'active' && styles.statusOptionSelected,
                      ]}
                      onPress={() => setActionValue('active')}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={actionValue === 'active' ? COLORS.success : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          actionValue === 'active' && styles.statusOptionTextSelected,
                        ]}
                      >
                        Activer
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        actionValue === 'inactive' && styles.statusOptionSelected,
                      ]}
                      onPress={() => setActionValue('inactive')}
                    >
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={actionValue === 'inactive' ? COLORS.error : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          actionValue === 'inactive' && styles.statusOptionTextSelected,
                        ]}
                      >
                        Désactiver
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, loading && styles.buttonDisabled]}
                onPress={executeBulkAction}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? 'Traitement...' : 'Appliquer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  selectAllButton: {
    padding: 4,
  },
  selectAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectionInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary + '15',
  },
  selectionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  itemCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    flexWrap: 'wrap',
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    minHeight: 48,
  },
  actionButtonDestructive: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButtonTextDestructive: {
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryList: {
    gap: 8,
  },
  categoryOption: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  categoryOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  categoryOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 8,
  },
  statusOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  statusOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  statusOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
