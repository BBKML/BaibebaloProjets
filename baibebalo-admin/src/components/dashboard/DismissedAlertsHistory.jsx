import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../../api/dashboard';
import apiClient from '../../api/client';

const DismissedAlertsHistory = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dismissed-alerts'],
    queryFn: () => dashboardAPI.getDismissedAlerts({ limit: 100 }),
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (alertId) => {
      return await apiClient.delete(`/admin/dashboard/alerts/dismissed/${alertId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dismissed-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast.success('Alerte restaurée');
      setSelectedAlert(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la restauration');
    },
  });

  const handleRestore = (alertId) => {
    restoreMutation.mutate(alertId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Historique des Alertes Masquées</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          ) : data?.data?.dismissed_alerts?.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">notifications_off</span>
              <p className="text-sm">Aucune alerte masquée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data?.dismissed_alerts?.map((alert) => (
                <div
                  key={alert.alert_id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      {alert.alert_id}
                    </p>
                    {alert.alert_type && (
                      <p className="text-xs text-slate-500">
                        Type: {alert.alert_type}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Masquée le: {new Date(alert.dismissed_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(alert.alert_id)}
                    disabled={restoreMutation.isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    {restoreMutation.isPending ? '...' : 'Restaurer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DismissedAlertsHistory;
