import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { supportAPI } from '../api/support';
import { formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => supportAPI.getTicketDetails(id),
    retry: 2,
  });

  const replyMutation = useMutation({
    mutationFn: (message) => supportAPI.replyToTicket(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id]);
      setMessage('');
      toast.success('Message envoyé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'envoi du message');
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: (resolution) => supportAPI.closeTicket(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id]);
      queryClient.invalidateQueries(['tickets']);
      toast.success('Ticket fermé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la fermeture du ticket');
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/support')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="h-8 w-64 skeleton"></div>
          </div>
          <TableSkeleton rows={5} columns={2} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Erreur</h3>
          <p className="text-red-700 dark:text-red-300">{error.message || 'Erreur lors du chargement du ticket'}</p>
          <button
            onClick={() => navigate('/support')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux tickets
          </button>
        </div>
      </Layout>
    );
  }

  const ticket = data?.data?.ticket || {};
  const messages = data?.data?.messages || [];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      replyMutation.mutate(message);
    }
  };

  const handleCloseTicket = () => {
    if (ticket.status === 'closed') {
      toast.error('Ce ticket est déjà fermé');
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir fermer ce ticket ?')) {
      const resolution = prompt('Raison de la fermeture (optionnel, laissez vide pour continuer):');
      // Si l'utilisateur annule le prompt, resolution sera null, ce qui est OK
      closeTicketMutation.mutate(resolution || null);
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Sidebar - Client Info */}
        <aside className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar p-6">
          {/* Client Info Card */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
              Profil Client
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                {ticket.user_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {ticket.user_name || 'N/A'}
                </h4>
                <p className="text-sm text-slate-500">{ticket.user_phone || 'N/A'}</p>
              </div>
            </div>
            {ticket.related_order && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                <div className="flex flex-col">
                  <span className="text-xs opacity-80">Commande liée</span>
                  <span className="text-sm font-bold">#{ticket.related_order.slice(0, 8)}</span>
                </div>
                <span className="material-symbols-outlined ml-auto text-sm">open_in_new</span>
              </div>
            )}
          </div>

          {/* Stats/History */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Historique
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full font-bold">
                {ticket.total_tickets || 0} Tickets
              </span>
            </div>
            <div className="space-y-3">
              {ticket.history && ticket.history.length > 0 ? (
                ticket.history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold">#{item.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-bold ${
                        item.status === 'resolved' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-slate-500'
                      }`}>
                        {item.status === 'resolved' ? 'Résolu' : 'Ouvert'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{formatDateShort(item.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aucun historique</p>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {ticket.internal_note && (
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
              <div className="flex items-center gap-2 mb-2 text-yellow-700 dark:text-yellow-500">
                <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                <span className="text-xs font-bold">Note Interne</span>
              </div>
              <p className="text-xs leading-relaxed text-yellow-800 dark:text-yellow-400/80">
                {ticket.internal_note}
              </p>
            </div>
          )}
        </aside>

        {/* Main Content - Chat Area */}
        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900">
          {/* Ticket Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-3 mb-2">
                {/* Catégorie */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                  ticket.category === 'order' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  ticket.category === 'payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  ticket.category === 'technical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  ticket.category === 'account' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {ticket.category === 'order' ? 'shopping_bag' :
                     ticket.category === 'payment' ? 'payments' :
                     ticket.category === 'technical' ? 'build' :
                     ticket.category === 'account' ? 'person' : 'help'}
                  </span>
                  {ticket.category === 'order' ? 'Commande' :
                   ticket.category === 'payment' ? 'Paiement' :
                   ticket.category === 'technical' ? 'Technique' :
                   ticket.category === 'account' ? 'Compte' : 'Autre'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  ticket.priority === 'urgent' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500'
                    : ticket.priority === 'high'
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500'
                }`}>
                  {ticket.priority === 'urgent' ? 'Urgent' : ticket.priority === 'high' ? 'Élevée' : 'Normale'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                  ticket.status === 'open' 
                    ? 'bg-primary/20 text-primary'
                    : ticket.status === 'in_progress'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                }`}>
                  {ticket.status === 'open' ? 'Nouveau' : ticket.status === 'in_progress' ? 'En cours' : 'Résolu'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {ticket.subject || 'Sujet du ticket'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ticket #{ticket.ticket_number || ticket.id?.slice(0, 8)} • Créé le {formatDateShort(ticket.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              {ticket.status !== 'closed' && (
                <button
                  onClick={handleCloseTicket}
                  disabled={closeTicketMutation.isLoading}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {closeTicketMutation.isLoading ? 'Fermeture...' : 'Fermer le ticket'}
                </button>
              )}
            </div>
          </div>

          {/* Description du problème */}
          {ticket.description && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Description du problème
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                <p>Aucun message dans cette conversation</p>
                <p className="text-xs mt-1">Envoyez un message pour commencer</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender_type === 'admin' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                  msg.sender_type === 'admin'
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {msg.sender_type === 'admin' ? 'A' : 'R'}
                </div>
                <div className={`flex-1 max-w-[85%] ${
                  msg.sender_type === 'admin' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block w-full p-4 rounded-2xl ${
                    msg.sender_type === 'admin'
                      ? 'bg-primary text-white rounded-tr-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={`text-xs mt-2 ${
                      msg.sender_type === 'admin' 
                        ? 'text-white/70' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {formatDateShort(msg.created_at)} • {msg.sender_type === 'admin' ? 'Support' : 'Restaurant'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                type="submit"
                disabled={!message.trim() || replyMutation.isLoading}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Envoyer
              </button>
            </form>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default TicketDetails;
