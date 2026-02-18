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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/client';

export default function OrderChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId, restaurantName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('💬 OrderChatScreen monté:', { orderId, restaurantName });
    loadMessages();
    
    // Polling pour les nouveaux messages toutes les 5 secondes
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadMessages = async () => {
    try {
      const response = await apiClient.get(`/orders/${orderId}/messages`);
      if (response.data?.success) {
        const loadedMessages = response.data.data.messages || [];
        console.log('📥 Messages chargés:', { count: loadedMessages.length, orderId });
        setMessages(loadedMessages);
        setOrderInfo(response.data.data.order);
        
        // Marquer comme lus
        if (response.data.data.unread_count > 0) {
          await apiClient.put(`/orders/${orderId}/messages/read`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      if (loading) {
        Alert.alert('Erreur', 'Impossible de charger les messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) {
      console.log('Envoi bloqué:', { hasMessage: !!newMessage.trim(), sending });
      return;
    }

    const messageToSend = newMessage.trim();
    console.log('📤 Envoi du message:', { orderId, message: messageToSend.substring(0, 50) });

    setSending(true);
    try {
      const response = await apiClient.post(`/orders/${orderId}/messages`, {
        message: messageToSend,
      });

      console.log('✅ Réponse serveur:', response.data);

      if (response.data?.success) {
        const newMsg = response.data.data.message;
        console.log('✅ Message ajouté:', newMsg);
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // Scroll vers le bas
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.warn('⚠️ Réponse sans success:', response.data);
        Alert.alert('Erreur', 'Le message n\'a pas pu être envoyé');
      }
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      console.error('Détails erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      const errorMsg = error.response?.data?.error?.message || error.message || 'Impossible d\'envoyer le message';
      Alert.alert('Erreur', errorMsg);
    } finally {
      setSending(false);
    }
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
    const isCustomer = item.sender_type === 'customer';
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
            isCustomer ? styles.customerMessage : styles.restaurantMessage,
          ]}>
            <View style={[
              styles.messageBubble,
              isCustomer ? styles.customerBubble : styles.restaurantBubble,
            ]}>
              <Text style={[
                styles.messageText,
                isCustomer ? styles.customerText : styles.restaurantText,
              ]}>
                {item.message}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isCustomer ? styles.customerTime : styles.restaurantTime,
                ]}>
                  {formatTime(item.created_at)}
                </Text>
                {isCustomer && item.read_at && (
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
            <Text style={styles.headerTitle}>{restaurantName || 'Restaurant'}</Text>
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
          <Text style={styles.headerTitle}>{orderInfo?.restaurant_name || restaurantName || 'Restaurant'}</Text>
          <Text style={styles.headerSubtitle}>Discussion sur votre commande</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="restaurant" size={24} color={COLORS.primary} />
        </View>
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
            <Text style={styles.emptyTitle}>Démarrez la conversation</Text>
            <Text style={styles.emptyText}>
              Posez vos questions ou faites vos demandes au restaurant concernant votre commande.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: 12 + Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor={COLORS.textLight}
            value={newMessage}
            onChangeText={(text) => {
              console.log('📝 Texte modifié:', text.substring(0, 30));
              setNewMessage(text);
            }}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={() => {
              console.log('⌨️ onSubmitEditing déclenché');
              // Ne pas fermer le clavier lors de la soumission
              if (newMessage.trim() && !sending) {
                sendMessage();
              }
            }}
            onKeyPress={({ nativeEvent }) => {
              // Sur Android, gérer la touche Entrée pour multiline
              if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                if (newMessage.trim() && !sending) {
                  sendMessage();
                }
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => {
              console.log('🔘 Bouton d\'envoi pressé:', { hasMessage: !!newMessage.trim(), sending });
              sendMessage();
            }}
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
  customerMessage: {
    alignItems: 'flex-end',
  },
  restaurantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  customerBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  restaurantBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  customerText: {
    color: COLORS.white,
  },
  restaurantText: {
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
  customerTime: {
    color: COLORS.white + 'CC',
  },
  restaurantTime: {
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
