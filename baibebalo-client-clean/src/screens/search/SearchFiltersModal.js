import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SearchFiltersModal({ visible, onClose, onApply, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    sortBy: initialFilters.sortBy || 'distance',
    minRating: initialFilters.minRating || 0,
    maxDeliveryTime: initialFilters.maxDeliveryTime || 60,
    priceRange: initialFilters.priceRange || 'all',
    cuisineType: initialFilters.cuisineType || [],
    freeDelivery: initialFilters.freeDelivery || false,
    newRestaurants: initialFilters.newRestaurants || false,
    mobileMoney: initialFilters.mobileMoney || false,
    promotions: initialFilters.promotions || false,
    ...initialFilters,
  });

  const sortOptions = [
    { value: 'distance', label: 'Distance' },
    { value: 'rating', label: 'Note' },
    { value: 'delivery_time', label: 'Temps de livraison' },
    { value: 'price_low', label: 'Prix croissant' },
    { value: 'price_high', label: 'Prix décroissant' },
  ];

  const priceRanges = [
    { value: 'all', label: 'Tous les prix' },
    { value: 'low', label: 'Économique (< 5000 FCFA)' },
    { value: 'medium', label: 'Moyen (5000-15000 FCFA)' },
    { value: 'high', label: 'Élevé (> 15000 FCFA)' },
  ];

  const cuisineTypes = [
    'Ivoirien',
    'Français',
    'Italien',
    'Asiatique',
    'Fast Food',
    'Pizzeria',
    'Grill',
    'Desserts',
  ];

  const handleReset = () => {
    setFilters({
      sortBy: 'distance',
      minRating: 0,
      maxDeliveryTime: 60,
      priceRange: 'all',
      cuisineType: [],
      freeDelivery: false,
      newRestaurants: false,
      mobileMoney: false,
      promotions: false,
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const toggleCuisineType = (type) => {
    setFilters({
      ...filters,
      cuisineType: filters.cuisineType.includes(type)
        ? filters.cuisineType.filter((t) => t !== type)
        : [...filters.cuisineType, type],
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filtres</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Trier par */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trier par</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    filters.sortBy === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFilters({ ...filters, sortBy: option.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      filters.sortBy === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filters.sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Note minimum */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Note minimum</Text>
              <View style={styles.ratingContainer}>
                {[0, 3, 3.5, 4, 4.5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      filters.minRating === rating && styles.ratingButtonSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, minRating: rating })}
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        filters.minRating === rating && styles.ratingTextSelected,
                      ]}
                    >
                      {rating === 0 ? 'Tous' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Temps de livraison max */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Temps de livraison maximum: {filters.maxDeliveryTime} min
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>15 min</Text>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${(filters.maxDeliveryTime / 60) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.sliderLabel}>60 min</Text>
              </View>
              <View style={styles.timeButtons}>
                {[30, 45, 60].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeButton,
                      filters.maxDeliveryTime === time && styles.timeButtonSelected,
                    ]}
                    onPress={() => setFilters({ ...filters, maxDeliveryTime: time })}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        filters.maxDeliveryTime === time && styles.timeButtonTextSelected,
                      ]}
                    >
                      {time} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fourchette de prix */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fourchette de prix</Text>
              {priceRanges.map((range) => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.optionButton,
                    filters.priceRange === range.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFilters({ ...filters, priceRange: range.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      filters.priceRange === range.value && styles.optionTextSelected,
                    ]}
                  >
                    {range.label}
                  </Text>
                  {filters.priceRange === range.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Type de cuisine */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type de cuisine</Text>
              <View style={styles.cuisineGrid}>
                {cuisineTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.cuisineTag,
                      filters.cuisineType.includes(type) && styles.cuisineTagSelected,
                    ]}
                    onPress={() => toggleCuisineType(type)}
                  >
                    <Text
                      style={[
                        styles.cuisineTagText,
                        filters.cuisineType.includes(type) && styles.cuisineTagTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Options spéciales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options spéciales</Text>
              {[
                { key: 'freeDelivery', label: 'Livraison gratuite' },
                { key: 'newRestaurants', label: 'Nouveaux restaurants' },
                { key: 'mobileMoney', label: 'Accepte Mobile Money' },
                { key: 'promotions', label: 'Promotions en cours' },
              ].map((option) => (
                <View key={option.key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{option.label}</Text>
                  <Switch
                    value={filters[option.key]}
                    onValueChange={(value) => setFilters({ ...filters, [option.key]: value })}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  resetText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  ratingButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text,
  },
  ratingTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  timeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  timeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  timeButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeButtonTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cuisineTagSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  cuisineTagText: {
    fontSize: 14,
    color: COLORS.text,
  },
  cuisineTagTextSelected: {
    fontWeight: '600',
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
