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
import { getSupportTicketById, addTicketMessage } from '../../api/support';

export default function ClaimTicketDetailsScreen({ navigation, route }) {
  const { ticketId } = route.params || {};
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await getSupportTicketById(ticketId);
      // Le backend peut retourner le ticket dans response.data.ticket ou response.data
      const ticketData = response.data?.ticket || response.data;
      setTicket(ticketData);
    } catch (error) {
      console.error('Erreur lors du chargement du ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (messageText) => {
    try {
      await addTicketMessage(ticketId, messageText);
      // Recharger les détails du ticket pour avoir les nouveaux messages
      await loadTicketDetails();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_cours':
        return COLORS.warning;
      case 'resolu':
        return COLORS.success;
      case 'ferme':
        return COLORS.textSecondary;
      default:
        return COLORS.info;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_cours':
        return 'En cours';
      case 'resolu':
        return 'Résolu';
      case 'ferme':
        return 'Fermé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ticket non trouvé</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {getStatusLabel(ticket.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.subject}>{ticket.subject}</Text>
      </View>

      {/* Informations */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="receipt-outline" size={20} color={COLORS.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Commande concernée</Text>
            <Text style={styles.infoValue}>#{ticket.order_id}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date de création</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        {ticket.priority && (
          <View style={styles.infoRow}>
            <Ionicons name="flag-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Priorité</Text>
              <Text style={styles.infoValue}>
                {ticket.priority === 'haute' && 'Haute'}
                {ticket.priority === 'moyenne' && 'Moyenne'}
                {ticket.priority === 'basse' && 'Basse'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{ticket.description}</Text>
      </View>

      {/* Messages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversation</Text>
        {ticket.messages?.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.sender === 'user' ? styles.userMessage : styles.supportMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
            <Text style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      {ticket.status === 'en_cours' && (
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('LiveChatSupport', { ticketId: ticket.id })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Répondre</Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subject: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: COLORS.primary + '10',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  supportMessage: {
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  actionsSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 32,
  },
});
