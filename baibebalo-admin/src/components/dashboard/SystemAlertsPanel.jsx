import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../../api/dashboard';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import DismissedAlertsHistory from './DismissedAlertsHistory';
import { useAlerts } from '../../contexts/AlertsContext';

const SystemAlertsPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showAlertsPanel, setShowAlertsPanel } = useAlerts();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const previousAlertsRef = useRef(new Set());
  const [newAlertsCount, setNewAlertsCount] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: () => dashboardAPI.getSystemAlerts(),
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Mutation pour masquer une alerte
  const dismissMutation = useMutation({
    mutationFn: async ({ alert_id, alert_type }) => {
      return await apiClient.post('/admin/dashboard/alerts/dismiss', {
        alert_id,
        alert_type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast.success('Alerte masquée');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors du masquage');
    },
  });

  const alerts = data?.data?.alerts || [];
  
  // Ne plus ouvrir automatiquement le panneau - l'utilisateur doit cliquer sur l'icône
  
  // Détecter les nouvelles alertes SANS afficher de toasts automatiques
  // Les toasts ne s'afficheront que si l'utilisateur clique sur l'icône
  useEffect(() => {
    if (alerts.length === 0) {
      previousAlertsRef.current = new Set();
      return;
    }

    const currentAlertIds = new Set(alerts.map(a => a.id));
    const previousAlertIds = previousAlertsRef.current;

    // Trouver les nouvelles alertes (pour le compteur uniquement)
    const newAlerts = alerts.filter(alert => !previousAlertIds.has(alert.id));

    if (newAlerts.length > 0) {
      // Mettre à jour le compteur de nouvelles alertes
      setNewAlertsCount(prev => prev + newAlerts.length);
    }

    // Mettre à jour la référence
    previousAlertsRef.current = currentAlertIds;
  }, [alerts]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const getAlertColor = (type, priority) => {
    if (type === 'error' || priority === 'high') {
      return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    }
    if (type === 'warning' || priority === 'medium') {
      return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20';
    }
    return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
  };

  const handleDismiss = (alert) => {
    dismissMutation.mutate({
      alert_id: alert.id,
      alert_type: alert.type,
    });
  };

  const handleAction = (action) => {
    if (action) {
      navigate(action);
    }
  };

  // Si le panneau est fermé, ne pas afficher (même pendant le chargement)
  if (!showAlertsPanel) {
    return null;
  }

  // Afficher le skeleton pendant le chargement
  if (isLoading) {
    return (
      <div className="fixed right-4 top-20 z-50 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notifications</span>
            <h3 className="font-bold text-slate-900 dark:text-white">Alertes Système</h3>
          </div>
          <button
            onClick={() => setShowAlertsPanel(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Si pas d'alertes mais panneau ouvert, afficher un message
  if (alerts.length === 0) {
    return (
      <div className="fixed right-4 top-20 z-50 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notifications</span>
            <h3 className="font-bold text-slate-900 dark:text-white">Alertes Système</h3>
          </div>
          <button
            onClick={() => setShowAlertsPanel(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="Fermer le panneau d'alertes"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <div className="p-6 text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
          <p className="text-sm">Aucune alerte système pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-20 z-50 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">notifications</span>
          <h3 className="font-bold text-slate-900 dark:text-white">Alertes Système</h3>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
          {newAlertsCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              +{newAlertsCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            title="Voir l'historique des alertes masquées"
          >
            Historique
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title={isExpanded ? 'Réduire' : 'Agrandir'}
          >
            <span className="material-symbols-outlined">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <button
            onClick={() => setShowAlertsPanel(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="Fermer le panneau d'alertes"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {alerts.map((alert) => {
            const isNew = !previousAlertsRef.current.has(alert.id);
            return (
            <div
              key={alert.id}
              className={`p-4 border-b border-slate-100 dark:border-slate-800 ${getAlertColor(alert.type, alert.priority)} ${isNew ? 'ring-2 ring-primary/50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined ${
                  alert.type === 'error' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {getAlertIcon(alert.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {alert.message}
                  </p>
                  <div className="flex gap-2">
                    {alert.action && (
                      <button
                        onClick={() => handleAction(alert.action)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Voir →
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert)}
                      disabled={dismissMutation.isPending}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                    >
                      {dismissMutation.isPending ? '...' : 'Ignorer'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert)}
                  disabled={dismissMutation.isPending}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal historique des alertes masquées */}
      <DismissedAlertsHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
};

export default SystemAlertsPanel;
