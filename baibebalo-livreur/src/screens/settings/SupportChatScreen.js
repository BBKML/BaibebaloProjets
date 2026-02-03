import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import apiClient from '../../api/client';

// Écran liste des conversations
function ConversationsList({ onSelectConversation, onNewConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/delivery/support/conversations');
      if (response.data?.success) {
        setConversations(response.data.data.conversations || []);
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'closed': return COLORS.textSecondary;
      default: return COLORS.textSecondary;
    }
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onSelectConversation(item)}
    >
      <View style={styles.conversationAvatar}>
        <Ionicons name="headset" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationSubject} numberOfLines={1}>
            {item.subject || 'Conversation'}
          </Text>
          <Text style={styles.conversationTime}>
            {formatDate(item.last_message_at || item.created_at)}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {item.last_message || item.description || 'Aucun message'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
        <View style={styles.conversationMeta}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.ticketNumber}>#{item.ticket_number}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptyText}>
            Démarrez une nouvelle conversation avec notre support
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Bouton nouvelle conversation */}
      <TouchableOpacity style={styles.newConversationButton} onPress={onNewConversation}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// Écran de chat
function ChatView({ conversation, onBack, isNew = false }) {
  const { user } = useAuthStore();
  const scrollViewRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [currentTicket, setCurrentTicket] = useState(conversation);
  const pollIntervalRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!currentTicket?.id) return;
    
    try {
      const response = await apiClient.get(`/delivery/support/messages/${currentTicket.id}`);
      if (response.data?.success) {
        const serverMessages = response.data.data.messages.map(m => ({
          id: m.id,
          type: m.sender_type === 'user' ? 'user' : 'support',
          text: m.message,
          timestamp: new Date(m.created_at),
        }));
        setMessages(serverMessages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTicket?.id]);

  useEffect(() => {
    if (isNew) {
      // Message de bienvenue pour nouvelle conversation
      setMessages([{
        id: 'welcome',
        type: 'system',
        text: `Bonjour ${user?.first_name || 'Livreur'} ! 👋\nComment pouvons-nous vous aider ?`,
        timestamp: new Date(),
      }]);
    } else {
      loadMessages();
    }
  }, [isNew, loadMessages, user?.first_name]);

  // Polling pour nouveaux messages (toutes les 5 secondes)
  useEffect(() => {
    if (currentTicket?.id && !isNew) {
      pollIntervalRef.current = setInterval(loadMessages, 5000);
      return () => clearInterval(pollIntervalRef.current);
    }
  }, [currentTicket?.id, isNew, loadMessages]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageText = message.trim();
    const tempId = Date.now().toString();

    // Ajouter message localement
    const userMessage = {
      id: tempId,
      type: 'user',
      text: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setSending(true);

    try {
      if (isNew || !currentTicket?.id) {
        // Créer nouvelle conversation
        const response = await apiClient.post('/delivery/support/contact', {
          subject: messageText.substring(0, 50),
          message: messageText,
        });

        if (response.data?.success) {
          const newTicket = response.data.data.ticket;
          setCurrentTicket(newTicket);
          
          // Message de confirmation
          setMessages(prev => [...prev, {
            id: 'confirm',
            type: 'system',
            text: `✅ Conversation créée ! (Ticket #${newTicket.ticket_number})\nNotre équipe vous répondra bientôt.`,
            timestamp: new Date(),
          }]);
        }
      } else {
        // Envoyer dans conversation existante
        await apiClient.post(`/delivery/support/messages/${currentTicket.id}`, {
          message: messageText,
        });
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        type: 'system',
        text: '❌ Erreur d\'envoi. Réessayez.',
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatTitle}>
            {isNew ? 'Nouvelle conversation' : (currentTicket?.subject || 'Support')}
          </Text>
          {currentTicket?.ticket_number && (
            <Text style={styles.chatSubtitle}>#{currentTicket.ticket_number}</Text>
          )}
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View key={msg.id}>
            {/* Séparateur de date si nécessaire */}
            {index === 0 || (
              new Date(messages[index - 1].timestamp).toDateString() !== 
              new Date(msg.timestamp).toDateString()
            ) && (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>
                  {msg.timestamp.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            )}
            
            <View style={[
              styles.messageWrapper,
              msg.type === 'user' && styles.messageWrapperUser,
              msg.type === 'system' && styles.messageWrapperSystem,
            ]}>
              {msg.type === 'support' && (
                <View style={styles.avatarSupport}>
                  <Ionicons name="headset" size={14} color={COLORS.primary} />
                </View>
              )}
              <View style={[
                styles.messageBubble,
                msg.type === 'user' && styles.messageBubbleUser,
                msg.type === 'system' && styles.messageBubbleSystem,
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.type === 'user' && styles.messageTextUser,
                  msg.type === 'system' && styles.messageTextSystem,
                ]}>
                  {msg.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  msg.type === 'user' && styles.messageTimeUser,
                ]}>
                  {formatTime(msg.timestamp)}
                  {msg.type === 'user' && ' ✓'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Écrivez votre message..."
          placeholderTextColor={COLORS.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Écran principal
export default function SupportChatScreen({ navigation }) {
  const [view, setView] = useState('list'); // 'list', 'chat', 'new'
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setView('chat');
  };

  const handleNewConversation = () => {
    setSelectedConversation(null);
    setView('new');
  };

  const handleBack = () => {
    setView('list');
    setSelectedConversation(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {view === 'list' && (
        <>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Support</Text>
            <View style={styles.placeholder} />
          </View>
          <ConversationsList
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </>
      )}
      
      {(view === 'chat' || view === 'new') && (
        <ChatView
          conversation={selectedConversation}
          onBack={handleBack}
          isNew={view === 'new'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
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
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.background, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { width: 40 },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Liste des conversations
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationPreview: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ticketNumber: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Nouveau message button
  newConversationButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  
  // Chat view
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatHeaderCenter: {
    flex: 1,
    marginLeft: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chatSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  onlineIndicator: {
    padding: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperSystem: {
    justifyContent: 'center',
  },
  avatarSupport: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    borderColor: COLORS.primary,
  },
  messageBubbleSystem: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '20',
    borderRadius: 12,
    alignSelf: 'center',
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextSystem: {
    color: COLORS.primary,
    textAlign: 'center',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
});
