import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="restaurant" size={80} color={COLORS.white} />
      <Text style={styles.title}>BAIBEBALO</Text>
      <ActivityIndicator
        size="large"
        color={COLORS.white}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});
