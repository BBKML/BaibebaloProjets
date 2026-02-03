import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Vibration,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import api from '../../api/auth';
import { API_ENDPOINTS } from '../../constants/api';
import socketService from '../../services/socketService';

export default function LiveChatSupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Charger les tickets existants
  useEffect(() => {
    loadTickets();
  }, []);

  // Connexion Socket.IO pour les messages en temps réel
  useEffect(() => {
    // Connecter au Socket.IO
    socketService.connect();
    
    // Écouter les nouvelles réponses du support
    const unsubscribe = socketService.on('new_support_reply', (data) => {
      console.log('📩 Message reçu via Socket:', data);
      
      // Si c'est pour notre ticket actif, ajouter le message
      if (activeTicket && data.ticket_id === activeTicket.id) {
        setMessages(prev => {
          // Éviter les doublons
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        
        // Vibration pour notifier
        Vibration.vibrate(200);
        
        // Scroller vers le bas
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [activeTicket]);

  // Rejoindre le ticket actif pour recevoir les messages
  useEffect(() => {
    if (activeTicket) {
      socketService.joinSupportTicket(activeTicket.id);
      return () => {
        socketService.leaveSupportTicket(activeTicket.id);
      };
    }
  }, [activeTicket?.id]);

  // Rafraîchissement automatique toutes les 15 secondes (backup si Socket ne fonctionne pas)
  useEffect(() => {
    let interval;
    if (activeTicket && activeTicket.status !== 'closed' && activeTicket.status !== 'resolved') {
      interval = setInterval(() => {
        loadTicketMessages(activeTicket.id);
      }, 15000); // 15 secondes comme backup
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTicket]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.SUPPORT.LIST_TICKETS);
      const ticketsList = response.data?.data?.tickets || [];
      setTickets(ticketsList);
      
      // Si un ticket ouvert existe, le sélectionner
      const openTicket = ticketsList.find(t => t.status === 'open' || t.status === 'in_progress');
      if (openTicket) {
        setActiveTicket(openTicket);
        loadTicketMessages(openTicket.id);
      }
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      console.log('📨 Chargement messages pour ticket:', ticketId);
      const response = await api.get(API_ENDPOINTS.SUPPORT.TICKET_DETAILS(ticketId));
      console.log('📨 Réponse API:', JSON.stringify(response.data, null, 2));
      
      const ticketData = response.data?.data;
      if (ticketData) {
        // Créer le premier message à partir de la description du ticket
        const initialMessage = {
          id: 'initial',
          sender_type: 'restaurant',
          message: ticketData.ticket?.description || '',
          created_at: ticketData.ticket?.created_at,
        };
        
        // Récupérer les messages de la conversation
        const ticketMessages = ticketData.messages || [];
        console.log('📨 Messages trouvés:', ticketMessages.length);
        console.log('📨 Détails messages:', ticketMessages.map(m => ({
          id: m.id,
          sender_type: m.sender_type,
          message: m.message?.substring(0, 50),
        })));
        
        // Combiner le message initial et les réponses
        const allMessages = [initialMessage, ...ticketMessages];
        setMessages(allMessages);
        setLastRefresh(new Date());
        
        // Mettre à jour le ticket actif avec les dernières infos
        if (ticketData.ticket) {
          setActiveTicket(ticketData.ticket);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      console.error('❌ Détails:', error.response?.data || error.message);
    }
  };
  
  const handleRefresh = async () => {
    if (!activeTicket) return;
    setRefreshing(true);
    await loadTicketMessages(activeTicket.id);
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Validation minimum 10 caractères pour nouveau ticket
    if (!activeTicket && message.trim().length < 10) {
      Alert.alert('Message trop court', 'Veuillez décrire votre problème en au moins 10 caractères.');
      return;
    }

    setSending(true);
    const messageText = message.trim();
    setMessage(''); // Vider immédiatement comme WhatsApp
    
    try {
      if (!activeTicket) {
        // Créer un nouveau ticket (premier message)
        const response = await api.post(API_ENDPOINTS.SUPPORT.CREATE_TICKET, {
          type: 'other',
          description: messageText,
        });
        
        if (response.data?.success) {
          const newTicket = response.data.data.ticket;
          setActiveTicket(newTicket);
          setMessages([{
            id: 'initial',
            sender_type: 'restaurant',
            message: messageText,
            created_at: new Date().toISOString(),
          }]);
        }
      } else {
        // Ajouter un message au ticket existant (style WhatsApp)
        // Afficher le message immédiatement (optimistic update)
        const tempMessage = {
          id: 'temp-' + Date.now(),
          sender_type: 'restaurant',
          message: messageText,
          created_at: new Date().toISOString(),
          pending: true,
        };
        setMessages(prev => [...prev, tempMessage]);
        
        // Envoyer au serveur
        const response = await api.post(API_ENDPOINTS.SUPPORT.SEND_MESSAGE(activeTicket.id), {
          message: messageText,
        });
        
        if (response.data?.success) {
          // Remplacer le message temporaire par le vrai
          const realMessage = response.data.data.message;
          setMessages(prev => prev.map(m => 
            m.id === tempMessage.id ? { ...realMessage, sender_type: 'restaurant' } : m
          ));
        }
      }
      
      // Scroller vers le bas
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Retirer le message temporaire en cas d'erreur
      setMessages(prev => prev.filter(m => !m.pending));
      setMessage(messageText); // Remettre le message dans l'input
      Alert.alert('Erreur', error.response?.data?.error?.message || 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Scroller vers le bas quand le clavier s'ouvre
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    return () => {
      keyboardDidShow.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Support Baibebalo</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, activeTicket?.status === 'in_progress' && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {activeTicket ? `Ticket #${activeTicket.ticket_number}` : 'Nouvelle conversation'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={[styles.refreshButton, refreshing && styles.refreshButtonActive]}
          disabled={refreshing || !activeTicket}
        >
          <Ionicons 
            name={refreshing ? "sync" : "refresh"} 
            size={22} 
            color={refreshing ? COLORS.primary : COLORS.text} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Barre d'info de mise à jour */}
      {activeTicket && (
        <TouchableOpacity style={styles.refreshBar} onPress={handleRefresh}>
          <Ionicons name="refresh-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.refreshBarText}>
            {refreshing ? 'Actualisation...' : 'Appuyez pour actualiser les messages'}
          </Text>
          {lastRefresh && (
            <Text style={styles.refreshBarTime}>
              {formatTime(lastRefresh.toISOString())}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Message de bienvenue */}
        <View style={styles.welcomeMessage}>
          <View style={styles.supportAvatar}>
            <Ionicons name="headset" size={24} color="#fff" />
          </View>
          <View style={styles.welcomeBubble}>
            <Text style={styles.welcomeText}>
              Bonjour ! 👋{'\n\n'}
              Bienvenue sur le support Baibebalo. Comment pouvons-nous vous aider aujourd'hui ?
              {'\n\n'}
              Décrivez votre problème et notre équipe vous répondra dans les plus brefs délais.
            </Text>
          </View>
        </View>

        {/* Messages du ticket */}
        {messages.map((msg, index) => (
          <View
            key={msg.id || index}
            style={[
              styles.messageWrapper,
              msg.sender_type === 'admin' ? styles.messageLeft : styles.messageRight,
            ]}
          >
            {msg.sender_type === 'admin' && (
              <View style={styles.supportAvatarSmall}>
                <Ionicons name="headset" size={16} color="#fff" />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.sender_type === 'admin' ? styles.bubbleLeft : styles.bubbleRight,
              ]}
            >
              {msg.sender_type === 'admin' && (
                <Text style={styles.senderLabel}>Support Baibebalo</Text>
              )}
              <Text style={[
                styles.messageText,
                msg.sender_type === 'admin' ? styles.textLeft : styles.textRight,
              ]}>
                {msg.message}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  msg.sender_type === 'admin' ? styles.timeLeft : styles.timeRight,
                ]}>
                  {formatDate(msg.created_at)} • {formatTime(msg.created_at)}
                </Text>
                {msg.pending && (
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                )}
                {!msg.pending && msg.sender_type === 'restaurant' && (
                  <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Indicateur de réponse en attente */}
        {activeTicket && activeTicket.status === 'open' && (
          <View style={styles.waitingIndicator}>
            <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.waitingText}>
              En attente de réponse du support...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) + 5 }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={activeTicket ? "Écrire un message..." : "Décrivez votre problème (min 10 car.)..."}
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={1000}
            textAlignVertical="center"
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
  },
  refreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  refreshBarText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  refreshBarTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  supportAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  welcomeBubble: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textLeft: {
    color: COLORS.text,
  },
  textRight: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  timeLeft: {
    color: COLORS.textLight,
  },
  timeRight: {
    color: 'rgba(255,255,255,0.7)',
  },
  waitingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  waitingText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textLight,
  },
  inputContainer: {
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
});
