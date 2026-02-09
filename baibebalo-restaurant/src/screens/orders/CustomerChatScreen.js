import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { restaurantOrders } from '../../api/orders';

export default function CustomerChatScreen({ route, navigation }) {
  const { orderId, customerName, orderNumber } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Templates de messages rapides
  const quickReplies = [
    { id: 1, text: 'Votre commande est en préparation' },
    { id: 2, text: 'Commande prête dans 5 minutes' },
    { id: 3, text: 'Désolé pour le retard' },
    { id: 4, text: 'Merci pour votre commande!' },
  ];

  useEffect(() => {
    loadMessages(false); // Premier chargement, toujours mettre à jour
    
    // Polling pour les nouveaux messages toutes les 5 secondes
    // Ne pas mettre à jour si l'input est en focus pour éviter de fermer le clavier
    const interval = setInterval(() => {
      if (!isInputFocused) {
        loadMessages(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadMessages = async (skipUpdateIfFocused = true) => {
    try {
      const response = await restaurantOrders.getOrderMessages(orderId);
      
      // Si l'input est en focus et qu'on veut éviter les mises à jour, ne pas mettre à jour les messages
      // sauf si c'est le premier chargement
      if (skipUpdateIfFocused && isInputFocused && !loading) {
        return;
      }
      
      // getOrderMessages retourne déjà response.data, donc on accède directement à response.success
      if (response?.success) {
        const newMessages = response.data?.messages || [];
        // Ne mettre à jour que si les messages ont changé (éviter les re-renders inutiles)
        setMessages(prev => {
          if (prev.length === newMessages.length && 
              prev.length > 0 && 
              prev[prev.length - 1].id === newMessages[newMessages.length - 1].id) {
            return prev; // Pas de changement, garder la référence
          }
          return newMessages;
        });
        setOrderInfo(response.data?.order);
        
        // Marquer comme lus
        if (response.data?.unread_count > 0) {
          await restaurantOrders.markMessagesRead(orderId);
        }
      } else if (response?.data?.success) {
        // Fallback pour compatibilité avec l'ancien format
        const newMessages = response.data.data?.messages || [];
        setMessages(prev => {
          if (prev.length === newMessages.length && 
              prev.length > 0 && 
              prev[prev.length - 1].id === newMessages[newMessages.length - 1].id) {
            return prev;
          }
          return newMessages;
        });
        setOrderInfo(response.data.data?.order);
        
        if (response.data.data?.unread_count > 0) {
          await restaurantOrders.markMessagesRead(orderId);
        }
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      // Ne pas afficher d'alerte pour les erreurs silencieuses (polling)
      if (loading && error.code !== 'FETCH_ERROR') {
        Alert.alert('Erreur', 'Impossible de charger les messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageText = null) => {
    const text = (messageText || newMessage).trim();
    if (!text || sending) return;

    setSending(true);
    const tempMessageId = `temp-${Date.now()}`;
    
    // Ajouter le message optimistiquement à la liste
    const optimisticMessage = {
      id: tempMessageId,
      message: text,
      sender_type: 'restaurant',
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    // Scroll vers le bas immédiatement
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await restaurantOrders.sendOrderMessage(orderId, text);

      if (response?.success || response?.data?.success) {
        // Le backend retourne { success: true, data: { message: {...} } }
        const actualMessage = response?.data?.message || response?.data?.data?.message;
        
        // Remplacer le message temporaire par le vrai message du serveur
        if (actualMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessageId ? actualMessage : msg
          ));
        } else {
          // Si pas de message retourné, recharger tous les messages
          setTimeout(() => {
            loadMessages();
          }, 300);
        }
      } else {
        // En cas d'échec, recharger quand même pour avoir l'état actuel
        setTimeout(() => {
          loadMessages();
        }, 300);
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Retirer le message temporaire en cas d'erreur
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      const errorMsg = error?.error?.message || error?.message || 'Impossible d\'envoyer le message';
      Alert.alert('Erreur', errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text) => {
    // Vider le champ de saisie et envoyer le message rapide
    setNewMessage('');
    sendMessage(text);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const renderDateSeparator = (currentDate, previousDate) => {
    const current = new Date(currentDate).toDateString();
    const previous = previousDate ? new Date(previousDate).toDateString() : null;
    
    if (current !== previous) {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{formatDate(currentDate)}</Text>
        </View>
      );
    }
    return null;
  };

  const renderMessage = ({ item, index }) => {
    const isRestaurant = item.sender_type === 'restaurant';
    const isSystem = item.sender_type === 'system';
    const previousMessage = index > 0 ? messages[index - 1] : null;

    return (
      <View>
        {renderDateSeparator(item.created_at, previousMessage?.created_at)}
        
        {isSystem ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{item.message}</Text>
          </View>
        ) : (
          <View style={[
            styles.messageContainer,
            isRestaurant ? styles.restaurantMessage : styles.customerMessage,
          ]}>
            <View style={[
              styles.messageBubble,
              isRestaurant ? styles.restaurantBubble : styles.customerBubble,
            ]}>
              <Text style={[
                styles.messageText,
                isRestaurant ? styles.restaurantText : styles.customerText,
              ]}>
                {item.message}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isRestaurant ? styles.restaurantTime : styles.customerTime,
                ]}>
                  {formatTime(item.created_at)}
                </Text>
                {isRestaurant && item.read_at && (
                  <Ionicons name="checkmark-done" size={14} color={COLORS.primary} style={styles.readIcon} />
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{customerName || 'Client'}</Text>
            <Text style={styles.headerSubtitle}>Chargement...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{orderInfo?.customer_name || customerName || 'Client'}</Text>
          <Text style={styles.headerSubtitle}>Commande #{orderNumber || orderId?.slice(0, 8)}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
        </View>
      </View>

      {/* Quick Replies */}
      <View style={styles.quickRepliesContainer}>
        <Text style={styles.quickRepliesLabel}>Réponses rapides:</Text>
        <FlatList
          horizontal
          data={quickReplies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.quickReplyButton}
              onPress={() => handleQuickReply(item.text)}
              disabled={sending}
            >
              <Text style={styles.quickReplyText}>{item.text}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesList}
        />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
              Le client n'a pas encore envoyé de message. Vous pouvez démarrer la conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id?.toString() || `msg-${item.created_at}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }}
            onLayout={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor={COLORS.textLight}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            returnKeyType="send"
            onFocus={() => {
              setIsInputFocused(true);
              // Scroll vers le bas quand le clavier s'ouvre
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
            onBlur={() => {
              setIsInputFocused(false);
            }}
            onSubmitEditing={() => {
              if (newMessage.trim() && !sending) {
                sendMessage();
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickRepliesContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickRepliesLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  quickRepliesList: {
    paddingHorizontal: 12,
  },
  quickReplyButton: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  quickReplyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    lineHeight: 20,
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
  messageContainer: {
    marginBottom: 8,
  },
  restaurantMessage: {
    alignItems: 'flex-end',
  },
  customerMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  restaurantBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  customerBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  restaurantText: {
    color: COLORS.white,
  },
  customerText: {
    color: COLORS.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  restaurantTime: {
    color: COLORS.white + 'CC',
  },
  customerTime: {
    color: COLORS.textSecondary,
  },
  readIcon: {
    marginLeft: 4,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
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
