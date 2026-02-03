import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import notificationsAPI from '../api/notifications';
import toast from 'react-hot-toast';

const SEGMENTS = [
  { id: 'all', label: 'Tous les clients', description: 'Tous les clients actifs avec l\'app installée' },
  { id: 'new', label: 'Nouveaux clients', description: 'Inscrits il y a moins de 30 jours' },
  { id: 'active', label: 'Clients actifs', description: 'Au moins une commande dans les 30 derniers jours' },
  { id: 'inactive', label: 'Clients inactifs', description: 'Aucune commande dans les 30 derniers jours' },
];

const SendNotification = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all');
  const [promoCode, setPromoCode] = useState('');
  const [result, setResult] = useState(null);

  const sendMutation = useMutation({
    mutationFn: () => notificationsAPI.sendPromotional(title, message, {
      segment,
      promoCode: promoCode || undefined,
    }),
    onSuccess: (data) => {
      setResult(data.data);
      toast.success(`Notifications envoyées : ${data.data.successful}/${data.data.total}`);
      // Reset form
      setTitle('');
      setMessage('');
      setPromoCode('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'envoi');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Le titre et le message sont requis');
      return;
    }
    if (globalThis.confirm(`Envoyer cette notification à tous les clients "${SEGMENTS.find(s => s.id === segment)?.label}" ?`)) {
      sendMutation.mutate();
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Envoyer une Notification
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Envoyez des notifications push promotionnelles aux clients
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Titre de la notification *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: 🎉 Offre spéciale !"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 mt-1">{title.length}/100 caractères</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Profitez de -20% sur votre prochaine commande avec le code PROMO20 !"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{message.length}/500 caractères</p>
              </div>

              {/* Segment */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Segment cible
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SEGMENTS.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setSegment(seg.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        segment === seg.id
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className={`block font-bold ${
                        segment === seg.id ? 'text-primary' : 'text-slate-900 dark:text-white'
                      }`}>
                        {seg.label}
                      </span>
                      <span className="text-xs text-slate-500">{seg.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code promo optionnel */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Code promo (optionnel)
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO20"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                  maxLength={20}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Si renseigné, sera inclus dans les données de la notification
                </p>
              </div>

              {/* Bouton */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={sendMutation.isPending || !title.trim() || !message.trim()}
                  className="w-full py-4 bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sendMutation.isPending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">send</span>
                      Envoyer la notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Aperçu */}
          <div className="space-y-6">
            {/* Aperçu de la notification */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                Aperçu
              </h3>
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
                    B
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {title || 'Titre de la notification'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 line-clamp-2">
                      {message || 'Message de la notification...'}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">maintenant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Résultat */}
            {result && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-6">
                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-4">
                  Dernier envoi
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total ciblé</span>
                    <span className="font-bold text-slate-900 dark:text-white">{result.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Envoyées</span>
                    <span className="font-bold text-emerald-600">{result.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Échouées</span>
                    <span className="font-bold text-red-600">{result.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Segment</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {SEGMENTS.find(s => s.id === result.segment)?.label || result.segment}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Conseils */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-3">
                Conseils
              </h3>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li>• Utilisez des emojis pour attirer l'attention</li>
                <li>• Gardez le titre court et percutant</li>
                <li>• Mentionnez la valeur ajoutée</li>
                <li>• Évitez d'envoyer trop fréquemment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SendNotification;
