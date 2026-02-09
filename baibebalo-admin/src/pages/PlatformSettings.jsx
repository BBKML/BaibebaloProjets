import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsAPI } from '../api/settings';

const PlatformSettings = () => {
  const queryClient = useQueryClient();

  // Charger les paramètres depuis l'API
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings(),
    retry: 2,
  });

  // Extraire les valeurs depuis l'API et mapper vers le format du formulaire
  const apiSettings = settingsData?.data?.settings || {};
  
  // Mapper les valeurs de l'API vers le format du formulaire
  const getInitialSettings = () => {
    const baseDeliveryFee = apiSettings['business.baseDeliveryFee']?.value || 
                           apiSettings['default_delivery_fee']?.value || 
                           500;
    const minOrderAmount = apiSettings['business.minOrderAmount']?.value || 
                          apiSettings['min_order_amount']?.value || 
                          1000;
    const maxDeliveryTime = apiSettings['business.maxDeliveryTime']?.value || 45;
    const maxPreparationTime = apiSettings['business.maxPreparationTime']?.value || 60;
    const maintenanceMode = apiSettings['maintenance_mode']?.value || false;
    
    // Note: deliveryPerKm et maxOrderValue ne sont pas dans config/index.js actuellement
    // On utilise des valeurs par défaut ou on les laisse vides
    const deliveryPerKm = apiSettings['business.deliveryPricePerExtraKm']?.value || 100;
    const maxOrderValue = apiSettings['business.maxOrderValue']?.value || null;

    return {
      platformStatus: !maintenanceMode, // maintenance_mode false = plateforme ouverte
      deliveryBaseFee: baseDeliveryFee,
      deliveryPerKm: deliveryPerKm,
      avgPrepTime: maxPreparationTime, // Utiliser maxPreparationTime comme référence
      maxDeliveryTime: maxDeliveryTime,
      minOrderValue: minOrderAmount,
      maxOrderValue: maxOrderValue || 0, // 0 = pas de limite
    };
  };

  const [settings, setSettings] = useState(getInitialSettings());

  // Mettre à jour les settings quand les données API sont chargées
  useEffect(() => {
    if (settingsData?.data?.settings) {
      setSettings(getInitialSettings());
    }
  }, [settingsData]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-save quand le toggle maintenance change (action critique)
  const handlePlatformStatusToggle = (checked) => {
    const newSettings = { ...settings, platformStatus: checked };
    setSettings(newSettings);
    // Sauvegarder immédiatement le mode maintenance
    const maintenanceSetting = {
      'maintenance_mode': {
        value: !checked, // platformStatus true = maintenance_mode false
        description: 'Mode maintenance activé',
        is_public: true,
      },
    };
    settingsAPI.updateSettings(maintenanceSetting).then(() => {
      toast.success(checked ? 'Plateforme ouverte aux commandes' : 'Plateforme fermée (mode maintenance activé)');
      queryClient.invalidateQueries(['app-settings']);
    }).catch((error) => {
      toast.error('Erreur lors du changement de statut');
      // Revenir en arrière si erreur
      setSettings((prev) => ({ ...prev, platformStatus: !checked }));
    });
  };

  // Mutation pour sauvegarder les paramètres
  const saveMutation = useMutation({
    mutationFn: async (settingsToSave) => {
      // Mapper les valeurs du formulaire vers le format de l'API
      const apiSettingsToSave = {
        'maintenance_mode': {
          value: !settingsToSave.platformStatus, // platformStatus true = maintenance_mode false
          description: 'Mode maintenance activé',
          is_public: true,
        },
        'business.baseDeliveryFee': {
          value: settingsToSave.deliveryBaseFee,
          description: 'Frais de livraison de base (FCFA)',
          is_public: true,
        },
        'business.deliveryPricePerExtraKm': {
          value: settingsToSave.deliveryPerKm,
          description: 'Prix par km supplémentaire (FCFA/km)',
          is_public: true,
        },
        'business.minOrderAmount': {
          value: settingsToSave.minOrderValue,
          description: 'Montant minimum de commande (FCFA)',
          is_public: true,
        },
        'business.maxDeliveryTime': {
          value: settingsToSave.maxDeliveryTime,
          description: 'Temps maximum de livraison (minutes)',
          is_public: true,
        },
        'business.maxPreparationTime': {
          value: settingsToSave.avgPrepTime,
          description: 'Temps maximum de préparation (minutes)',
          is_public: true,
        },
      };

      // Ajouter maxOrderValue si défini
      if (settingsToSave.maxOrderValue > 0) {
        apiSettingsToSave['business.maxOrderValue'] = {
          value: settingsToSave.maxOrderValue,
          description: 'Montant maximum de commande (FCFA)',
          is_public: true,
        };
      }

      return settingsAPI.updateSettings(apiSettingsToSave);
    },
    onSuccess: () => {
      toast.success('Paramètres sauvegardés avec succès');
      queryClient.invalidateQueries(['app-settings']);
      // ⚠️ IMPORTANT: Les calculs backend utilisent toujours config/index.js
      // Il faudra redémarrer le serveur après modification de config/index.js
      toast('⚠️ Modifiez aussi config/index.js et redémarrez le serveur pour appliquer les changements aux calculs', {
        duration: 5000,
        icon: '⚠️',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la sauvegarde');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Chargement des paramètres...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Paramètres Généraux
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Contrôlez les paramètres opérationnels critiques de la plateforme BAIBEBALO.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pr-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <label className="relative inline-flex items-center cursor-pointer ml-2">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.platformStatus}
                onChange={(e) => handlePlatformStatusToggle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                Status Plateforme
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tighter">
                {settings.platformStatus ? 'Ouvert aux commandes' : 'Fermé'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Frais de Livraison */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">payments</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Frais de Livraison</h3>
              </div>
              <span
                className="material-symbols-outlined text-slate-400 cursor-help"
                title="Configurez les frais facturés aux clients pour la livraison."
              >
                info
              </span>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Frais de base
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="2.50"
                      value={settings.deliveryBaseFee}
                      onChange={(e) => handleChange('deliveryBaseFee', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 italic">
                    Frais fixe appliqué à chaque commande livraison.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Frais par kilomètre
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="0.75"
                      value={settings.deliveryPerKm}
                      onChange={(e) => handleChange('deliveryPerKm', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA/km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Section: Gestion des Délais */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gestion des Délais</h3>
              </div>
              <span
                className="material-symbols-outlined text-slate-400 cursor-help"
                title="Estimation des temps de traitement pour les clients."
              >
                info
              </span>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Temps de préparation moyen
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-16 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="15"
                      value={settings.avgPrepTime}
                      onChange={(e) => handleChange('avgPrepTime', parseInt(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">min</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Délai de livraison maximum
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-16 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="45"
                      value={settings.maxDeliveryTime}
                      onChange={(e) => handleChange('maxDeliveryTime', parseInt(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Section: Limites de Commandes */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Limites de Commandes</h3>
              </div>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Montant minimum de commande
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="10.00"
                      value={settings.minOrderValue}
                      onChange={(e) => handleChange('minOrderValue', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Montant maximum de commande
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="500.00"
                      value={settings.maxOrderValue}
                      onChange={(e) => handleChange('maxOrderValue', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PlatformSettings;
