import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const notifications = [
  { id: '1', title: 'Nouvelle course disponible', message: 'Une course est disponible près de vous', time: 'Il y a 5 min', read: false },
  { id: '2', title: 'Paiement reçu', message: 'Votre demande de retrait a été traitée', time: 'Il y a 2h', read: true },
  { id: '3', title: 'Objectif atteint!', message: 'Vous avez atteint votre objectif quotidien', time: 'Hier', read: true },
];

export default function NotificationCenterScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.notifItem, !item.read && styles.notifItemUnread]}>
            <View style={[styles.notifIcon, !item.read && styles.notifIconUnread]}>
              <Ionicons name="notifications" size={20} color={item.read ? COLORS.textSecondary : COLORS.primary} />
            </View>
            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  list: { padding: 16 },
  notifItem: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  notifItemUnread: { backgroundColor: COLORS.primary + '08', borderColor: COLORS.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifIconUnread: { backgroundColor: COLORS.primary + '15' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  notifTitleUnread: { color: COLORS.primary },
  notifMessage: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notifTime: { fontSize: 10, color: COLORS.textLight, marginTop: 4 },
});
