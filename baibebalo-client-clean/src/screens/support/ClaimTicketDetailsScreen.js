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
import { getSupportTicketById } from '../../api/support';

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

  const supportMessages = ticket?.messages?.length
    ? ticket.messages
    : [
        {
          id: 'm-1',
          sender: 'support',
          text: 'Bonjour ! Nous sommes désolés pour cet incident. Nous revenons vers vous rapidement.',
          timestamp: ticket?.created_at || new Date(),
        },
        {
          id: 'm-2',
          sender: 'user',
          text: 'Merci pour votre réactivité. J’ai ajouté des photos.',
          timestamp: ticket?.created_at || new Date(),
        },
      ];

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
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
          <Text style={styles.topBarStatus}>{getStatusLabel(ticket.status)}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="document-text-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.sectionHeaderText}>Détails de la réclamation</Text>
        </View>

        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <Text style={styles.claimTitle}>{ticket.subject}</Text>
            <Text style={styles.claimDate}>
              {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Text style={styles.description}>{ticket.description}</Text>
          <View style={styles.mediaGrid}>
            <View style={styles.mediaItem} />
            <View style={styles.mediaItem} />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.sectionHeaderText}>Historique du support</Text>
        </View>

        <View style={styles.messagesList}>
          {supportMessages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <View key={message.id} style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
                <Text style={styles.messageMeta}>
                  {isUser ? 'Vous' : 'Équipe Support BAIBEBALO'} •{' '}
                  {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
                  <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                    {message.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>Ajouter des informations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.text} />
          <Text style={styles.secondaryButtonText}>Marquer comme résolu</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  topBarStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  claimCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  claimTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  claimDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  mediaItem: {
    flex: 1,
    height: 90,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messagesList: {
    gap: 12,
  },
  messageBlock: {
    gap: 6,
  },
  messageBlockUser: {
    alignItems: 'flex-end',
  },
  messageMeta: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '85%',
  },
  supportBubble: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: COLORS.white,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
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
