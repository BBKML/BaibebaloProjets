import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../api/orders';
import { restaurantsAPI } from '../../api/restaurants';
import driversAPI from '../../api/drivers';

const ExportOrdersModal = ({ isOpen, onClose }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed']);
  const [selectedZones, setSelectedZones] = useState([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeColumns, setIncludeColumns] = useState([
    'id',
    'date',
    'client',
    'restaurant',
    'status',
    'amount',
    'zone',
    'payment_method',
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [previewOrders, setPreviewOrders] = useState([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(500000);

  // Charger les restaurants et livreurs quand le modal s'ouvre
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadRestaurantsAndDrivers = async () => {
      try {
        // Charger les restaurants
        const restaurantsResponse = await restaurantsAPI.getRestaurants({ status: 'active', limit: 100 });
        if (restaurantsResponse.success && restaurantsResponse.data?.restaurants) {
          setRestaurants(restaurantsResponse.data.restaurants);
        }

        // Charger les livreurs
        const driversResponse = await driversAPI.getDrivers({ status: 'active', limit: 100 });
        if (driversResponse.success && driversResponse.data) {
          // L'API peut retourner delivery_persons ou drivers selon l'endpoint
          const drivers = driversResponse.data.delivery_persons || driversResponse.data.drivers || driversResponse.data.data?.delivery_persons || [];
          setDeliveryPersons(drivers);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des restaurants/livreurs:', error);
      }
    };

    loadRestaurantsAndDrivers();
  }, [isOpen]);

  // Charger les données de prévisualisation quand les filtres changent
  useEffect(() => {
    // Ne pas charger si le modal n'est pas ouvert
    if (!isOpen) {
      return;
    }

    const loadPreviewData = async () => {
      // Ne charger que si les dates sont définies
      if (!dateFrom || !dateTo) {
        setPreviewOrders([]);
        setTotalOrdersCount(0);
        return;
      }

      setIsLoadingPreview(true);
      try {
        // Préparer les paramètres pour l'API
        const params = {
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          limit: 5, // Seulement les 5 premières pour la prévisualisation
        };

        // Ajouter le statut si un seul est sélectionné
        if (selectedStatuses.length === 1) {
          params.status = selectedStatuses[0];
        }

        // Ajouter les filtres restaurant et livreur
        if (selectedRestaurant) {
          params.restaurant_id = selectedRestaurant;
        }
        if (selectedDeliveryPerson) {
          params.delivery_person_id = selectedDeliveryPerson;
        }

        const response = await ordersAPI.getOrders(params);
        
        if (response.success && response.data) {
          // Formater les données pour l'affichage
          // L'API retourne directement client_name et restaurant_name depuis les JOINs
          const formattedOrders = response.data.orders?.slice(0, 5).map(order => ({
            id: order.order_number || `#${order.id?.substring(0, 8)}`,
            client: order.client_name || 'N/A',
            total: `${parseFloat(order.total || 0).toLocaleString('fr-FR')} FCFA`,
            date: order.placed_at 
              ? new Date(order.placed_at).toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: '2-digit' 
                })
              : 'N/A',
          })) || [];

          setPreviewOrders(formattedOrders);
          setTotalOrdersCount(response.data.pagination?.total || 0);
        } else {
          setPreviewOrders([]);
          setTotalOrdersCount(0);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la prévisualisation:', error);
        setPreviewOrders([]);
        setTotalOrdersCount(0);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    // Délai pour éviter trop de requêtes lors de la saisie
    const timeoutId = setTimeout(loadPreviewData, 500);
    return () => clearTimeout(timeoutId);
  }, [isOpen, dateFrom, dateTo, selectedStatuses, selectedRestaurant, selectedDeliveryPerson]);

  if (!isOpen) return null;

  const statusOptions = [
    { id: 'pending', label: 'En attente' },
    { id: 'confirmed', label: 'Confirmée' },
    { id: 'preparing', label: 'En préparation' },
    { id: 'ready', label: 'Prête' },
    { id: 'delivering', label: 'En livraison' },
    { id: 'completed', label: 'Complétée' },
    { id: 'cancelled', label: 'Annulée' },
    { id: 'refunded', label: 'Remboursée' },
  ];

  const zoneOptions = [
    { id: 'centre-ville', label: 'Centre-ville' },
    { id: 'quartier-nord', label: 'Quartier Nord' },
    { id: 'quartier-sud', label: 'Quartier Sud' },
    { id: 'peripherie-est', label: 'Périphérie Est' },
    { id: 'peripherie-ouest', label: 'Périphérie Ouest' },
  ];

  const paymentMethodOptions = [
    { id: 'cash', label: 'Espèces' },
    { id: 'orange', label: 'Orange Money' },
    { id: 'mtn', label: 'MTN Mobile Money' },
    { id: 'card', label: 'Carte bancaire' },
  ];

  const columnOptions = [
    { id: 'id', label: 'ID Commande' },
    { id: 'date', label: 'Date' },
    { id: 'client', label: 'Client' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'status', label: 'Statut' },
    { id: 'amount', label: 'Montant' },
    { id: 'zone', label: 'Zone' },
    { id: 'payment_method', label: 'Méthode de paiement' },
    { id: 'delivery_time', label: 'Temps de livraison' },
    { id: 'rating', label: 'Note' },
    { id: 'driver', label: 'Livreur' },
  ];

  const handleToggleStatus = (statusId) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId]
    );
  };

  const handleToggleZone = (zoneId) => {
    setSelectedZones((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleTogglePaymentMethod = (methodId) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(methodId) ? prev.filter((id) => id !== methodId) : [...prev, methodId]
    );
  };

  const handleToggleColumn = (columnId) => {
    setIncludeColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Veuillez sélectionner une période');
      return;
    }

    setIsExporting(true);
    try {
      // Préparer les paramètres pour l'API
      const params = {
        date_from: dateFrom,
        date_to: dateTo,
      };

      // Ajouter le statut si un seul est sélectionné
      if (selectedStatuses.length === 1) {
        params.status = selectedStatuses[0];
      }

      // Ajouter les filtres restaurant et livreur
      if (selectedRestaurant) {
        params.restaurant_id = selectedRestaurant;
      }
      if (selectedDeliveryPerson) {
        params.delivery_person_id = selectedDeliveryPerson;
      }

      // Ajouter les filtres de montant
      if (amountMin > 0) {
        params.amount_min = amountMin;
      }
      if (amountMax < 500000) {
        params.amount_max = amountMax;
      }

      // Convertir le format (xlsx -> excel pour l'API)
      const apiFormat = exportFormat === 'xlsx' ? 'excel' : exportFormat;

      // Appeler l'API d'export
      await ordersAPI.exportOrders(apiFormat, params);
      
      toast.success(`Export ${exportFormat.toUpperCase()} réussi !`);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101c22]/85 backdrop-blur-sm">
      <div className="bg-[#182b34] w-full max-w-[1000px] h-[90vh] rounded-xl border border-[#315668] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#315668] flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Exporter les Commandes</h3>
            <p className="text-sm text-[#90b7cb]">Configurez vos filtres pour générer un rapport personnalisé.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-[#90b7cb]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Filters */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
              {/* Date Range Picker Style */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                  Période de temps
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-[#101c22] border border-[#315668] rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary text-white"
                    />
                    <span className="absolute right-3 top-3 text-[#90b7cb] pointer-events-none text-xs">Début</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-[#101c22] border border-[#315668] rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary text-white"
                    />
                    <span className="absolute right-3 top-3 text-[#90b7cb] pointer-events-none text-xs">Fin</span>
                  </div>
                </div>
              </div>

              {/* Status Selection (Chips) */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">checklist</span>
                  Statuts de commande
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => handleToggleStatus(status.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedStatuses.includes(status.id)
                          ? 'bg-primary text-white'
                          : 'bg-[#182b34] border border-[#315668] text-[#90b7cb] hover:border-primary/50'
                      }`}
                    >
                      {status.label}
                      {selectedStatuses.includes(status.id) && (
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {/* Restaurant and Driver Search */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-white">Restaurant</label>
                  <div className="relative">
                    <select 
                      value={selectedRestaurant}
                      onChange={(e) => setSelectedRestaurant(e.target.value)}
                      className="w-full appearance-none bg-[#101c22] border border-[#315668] rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary text-white"
                    >
                      <option value="">Tous les restaurants</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#90b7cb] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-white">Livreur</label>
                  <div className="relative">
                    <select 
                      value={selectedDeliveryPerson}
                      onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                      className="w-full appearance-none bg-[#101c22] border border-[#315668] rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary text-white"
                    >
                      <option value="">Tous les livreurs</option>
                      {deliveryPersons.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name && driver.last_name 
                            ? `${driver.first_name} ${driver.last_name}`
                            : driver.phone || `Livreur ${driver.id?.substring(0, 8)}`}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-[#90b7cb] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
              {/* Amount Range */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white flex justify-between">
                  <span>Intervalle de montant</span>
                  <span className="text-primary">
                    {amountMin.toLocaleString('fr-FR')} FCFA - {amountMax >= 500000 ? '500 000+' : amountMax.toLocaleString('fr-FR')} FCFA
                  </span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    className="w-28 bg-[#101c22] border border-[#315668] rounded-lg px-3 py-2 text-sm text-white"
                    placeholder="Min"
                    type="number"
                    min="0"
                    max={amountMax}
                    value={amountMin || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setAmountMin(Math.max(0, Math.min(val, amountMax)));
                    }}
                  />
                  <span className="text-[#90b7cb] text-sm">-</span>
                  <input
                    className="w-28 bg-[#101c22] border border-[#315668] rounded-lg px-3 py-2 text-sm text-white"
                    placeholder="Max"
                    type="number"
                    min={amountMin}
                    value={amountMax >= 500000 ? '' : amountMax || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!val || val >= 500000) {
                        setAmountMax(500000);
                      } else {
                        setAmountMax(Math.max(amountMin, Math.min(500000, val)));
                      }
                    }}
                  />
                  <span className="text-[#90b7cb] text-xs">FCFA</span>
                </div>
              </div>
            </div>
            {/* Right Column: Format & Preview */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              {/* Format Toggle */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white">Format de fichier</label>
                <div className="grid grid-cols-3 p-1 bg-[#101c22] border border-[#315668] rounded-xl">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                      exportFormat === 'csv'
                        ? 'bg-[#182b34] border border-[#315668] text-white shadow-lg'
                        : 'text-[#90b7cb] hover:text-white'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('xlsx')}
                    className={`py-2.5 rounded-lg text-sm transition-all ${
                      exportFormat === 'xlsx'
                        ? 'bg-[#182b34] border border-[#315668] text-white shadow-lg'
                        : 'text-[#90b7cb] hover:text-white'
                    }`}
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`py-2.5 rounded-lg text-sm transition-all ${
                      exportFormat === 'pdf'
                        ? 'bg-[#182b34] border border-[#315668] text-white shadow-lg'
                        : 'text-[#90b7cb] hover:text-white'
                    }`}
                  >
                    PDF
                  </button>
                </div>
              </div>
              {/* Preview Section */}
              <div className="flex-1 flex flex-col gap-3">
                <label className="text-sm font-semibold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#90b7cb]">visibility</span>
                    Aperçu (5 premières lignes)
                  </span>
                  <span className="text-[10px] uppercase text-[#90b7cb] tracking-widest">Live Data</span>
                </label>
                <div className="flex-1 bg-[#101c22] border border-[#315668] rounded-xl overflow-hidden flex flex-col">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#182b34]/50 text-[#90b7cb] border-b border-[#315668]">
                      <tr>
                        <th className="px-3 py-2 font-medium">ID</th>
                        <th className="px-3 py-2 font-medium">Client</th>
                        <th className="px-3 py-2 font-medium">Total</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#315668]/30">
                      {isLoadingPreview ? (
                        <tr>
                          <td colSpan="4" className="px-3 py-8 text-center text-[#90b7cb]">
                            <span className="material-symbols-outlined animate-spin inline-block mr-2">sync</span>
                            Chargement...
                          </td>
                        </tr>
                      ) : previewOrders.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-3 py-8 text-center text-[#90b7cb]">
                            {dateFrom && dateTo ? 'Aucune commande trouvée pour cette période' : 'Sélectionnez une période pour voir les données'}
                          </td>
                        </tr>
                      ) : (
                        previewOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-[#90b7cb]">{order.id}</td>
                            <td className="px-3 py-2 text-white font-medium">{order.client}</td>
                            <td className="px-3 py-2 text-white font-bold">{order.total}</td>
                            <td className="px-3 py-2 text-[#90b7cb]">{order.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="mt-auto p-3 text-center bg-[#182b34]/20">
                    <p className="text-[10px] text-[#90b7cb]">
                      Colonnes incluses: Numéro, Date, Client, Restaurant, Livreur, Sous-total, Frais livraison, Réduction, Taxe, Commission, Total, Statut, Mode paiement, Statut paiement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#182b34]/30 border-t border-[#315668] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#90b7cb]">
            <span className="material-symbols-outlined text-sm">info</span>
            <span className="text-sm font-medium">
              <span className="text-white font-bold">{totalOrdersCount || 0}</span> commandes sélectionnées
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-[#90b7cb] hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                  Export en cours...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">download</span>
                  Exporter ({exportFormat.toUpperCase()})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportOrdersModal;
