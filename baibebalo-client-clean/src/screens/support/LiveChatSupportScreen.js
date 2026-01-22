import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { addTicketMessage, createSupportTicket, getSupportTicketById } from '../../api/support';

export default function LiveChatSupportScreen({ navigation, route }) {
  const { ticketId: initialTicketId } = route?.params || {};
  const [ticketId, setTicketId] = useState(initialTicketId || null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
      sender: 'support',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const minLength = ticketId ? 5 : 10;
  const trimmedInput = inputText.trim();
  const canSend = trimmedInput.length > 0;
  const isTooShort = trimmedInput.length > 0 && trimmedInput.length < minLength;
  const quickActions = ['Où est ma commande ?', 'Articles manquants', 'Parler à un agent'];

  useEffect(() => {
    if (ticketId) {
      loadTicketMessages(ticketId);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      loadTicketMessages(ticketId);
    }, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const loadTicketMessages = async (id) => {
    try {
      const response = await getSupportTicketById(id);
      const ticketData = response.data?.ticket || response.data;
      const formattedMessages = ticketData?.messages || [];
      if (formattedMessages.length > 0) {
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const handleRefresh = async () => {
    if (!ticketId) return;
    setRefreshing(true);
    try {
      await loadTicketMessages(ticketId);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Auto-scroll vers le bas quand de nouveaux messages arrivent
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!trimmedInput) return;
    if (trimmedInput.length < minLength) {
      Alert.alert(
        'Message trop court',
        `Le message doit contenir au moins ${minLength} caractères.`
      );
      return;
    }

    try {
      let activeTicketId = ticketId;
      if (!activeTicketId) {
        const createResponse = await createSupportTicket({
          category: 'other',
          subject: 'Chat support',
          message: trimmedInput,
          priority: 'medium',
        });
        const createdTicket = createResponse.data?.ticket || createResponse.data;
        activeTicketId = createdTicket?.id;
        setTicketId(activeTicketId || null);
      } else {
        await addTicketMessage(activeTicketId, trimmedInput);
      }

      if (activeTicketId) {
        await loadTicketMessages(activeTicketId);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), text: trimmedInput, sender: 'user', timestamp: new Date() },
        ]);
      }
      setInputText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      console.error('Erreur envoi message support:', error);
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowSupport]}>
        {!isUser && (
          <View style={styles.avatarSupport}>
            <Ionicons name="headset" size={16} color={COLORS.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.supportMessageText]}>
            {item.text}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        {isUser && (
          <View style={styles.avatarUser}>
            <Ionicons name="person" size={16} color={COLORS.text} />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Support BAIBEBALO</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        refreshControl={
          ticketId ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          ) : undefined
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputInner}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Tapez votre message..."
            placeholderTextColor={COLORS.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons
              name="send"
              size={18}
              color={canSend ? COLORS.white : COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.quickActions}>
          {quickActions.map((label) => (
            <TouchableOpacity key={label} style={styles.quickActionChip}>
              <Text style={styles.quickActionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.helperText, isTooShort && styles.helperTextError]}>
          {isTooShort ? `Message trop court (${trimmedInput.length}/${minLength})` : `Min. ${minLength} caractères`}
        </Text>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  onlineText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowSupport: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatarSupport: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  avatarUser: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  supportBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: COLORS.white,
  },
  supportMessageText: {
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 90,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  quickActionChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickActionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  helperTextError: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
