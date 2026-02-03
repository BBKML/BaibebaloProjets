import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import driversAPI from '../api/drivers';
import TableSkeleton from '../components/common/TableSkeleton';
import { getImageUrl } from '../utils/url';

const Drivers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const menuRef = useRef(null);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActionsMenu(null);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', () => setShowActionsMenu(null), true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', () => setShowActionsMenu(null), true);
    };
  }, [showActionsMenu]);

  // Déterminer le statut selon l'onglet actif
  const statusFilter = activeTab === 'all' ? '' : activeTab === 'active' ? 'active' : activeTab === 'suspended' ? 'suspended' : '';

  // Charger les livreurs
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', { status: statusFilter, search: searchQuery, page, limit }],
    queryFn: () => driversAPI.getDrivers({ status: statusFilter, search: searchQuery, page, limit }),
  });

  // Reset page quand on change de filtre
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Mutation pour créer un livreur
  const createMutation = useMutation({
    mutationFn: driversAPI.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setShowCreateModal(false);
      toast.success('Livreur créé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  // Mutation pour modifier un livreur
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => driversAPI.updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setShowEditModal(false);
      setSelectedDriver(null);
      toast.success('Livreur modifié avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la modification');
    },
  });

  // Mutation pour supprimer un livreur
  const deleteMutation = useMutation({
    mutationFn: driversAPI.deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setShowDeleteModal(false);
      setSelectedDriver(null);
      toast.success('Livreur supprimé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const drivers = data?.data?.delivery_persons || [];
  const pagination = data?.data?.pagination || {};
  const totalDrivers = pagination.total || 0;
  const totalPages = pagination.pages || 1;
  const activeDrivers = drivers.filter((d) => d.status === 'active').length;

  // Les données sont déjà filtrées par l'API
  const filteredDrivers = drivers;

  const handleViewDetails = (driverId) => {
    navigate(`/drivers/${driverId}`);
  };

  const handleCreate = (formData) => {
    createMutation.mutate(formData);
  };

  const handleEdit = (formData) => {
    if (!selectedDriver) return;
    updateMutation.mutate({ id: selectedDriver.id, data: formData });
  };

  const handleDelete = () => {
    if (!selectedDriver) return;
    deleteMutation.mutate(selectedDriver.id);
  };

  const handleOpenEdit = (driver, e) => {
    e.stopPropagation();
    setSelectedDriver(driver);
    setShowEditModal(true);
    setShowActionsMenu(null);
  };

  const handleOpenDelete = (driver, e) => {
    e.stopPropagation();
    setSelectedDriver(driver);
    setShowDeleteModal(true);
    setShowActionsMenu(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'offline':
      case 'pending':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      case 'suspended':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'rejected':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'offline':
        return 'Hors ligne';
      case 'pending':
        return 'En attente';
      case 'suspended':
        return 'Suspendu';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const getVehicleIcon = (vehicle) => {
    switch (vehicle?.toLowerCase()) {
      case 'moto':
        return 'motorcycle';
      case 'bike':
      case 'vélo':
        return 'pedal_bike';
      case 'foot':
      case 'pied':
        return 'directions_walk';
      default:
        return 'local_shipping';
    }
  };

  const getVehicleLabel = (vehicle) => {
    switch (vehicle?.toLowerCase()) {
      case 'moto':
        return 'Moto';
      case 'bike':
        return 'Vélo';
      case 'foot':
        return 'Pied';
      default:
        return vehicle || 'N/A';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Gestion des Livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chargement...</p>
          </div>
          <TableSkeleton rows={10} columns={8} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Erreur lors du chargement</h3>
          <p className="text-red-700 dark:text-red-300 mt-2">{error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Gestion des Livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {totalDrivers} livreurs au total •{' '}
              <span className="text-emerald-500 font-medium">{activeDrivers} actifs</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              title="Filtrer les livreurs"
              aria-label="Filtrer"
            >
              <span className="material-symbols-outlined text-slate-400">filter_list</span>
              Filtrer
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md"
              title="Ajouter un nouveau livreur"
              aria-label="Nouveau livreur"
            >
              <span className="material-symbols-outlined">person_add</span>
              Nouveau Livreur
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 overflow-x-auto">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Tous les livreurs
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] ml-1">
                {totalDrivers}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('active')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Actifs
            </button>
            <button
              onClick={() => handleTabChange('offline')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'offline'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">offline_bolt</span>
              Hors ligne
            </button>
            <button
              onClick={() => handleTabChange('suspended')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'suspended'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">block</span>
              Suspendus
            </button>
          </div>
          <div className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500"
                placeholder="Rechercher par nom, téléphone ou ID..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-3 pr-10 text-sm focus:ring-1 focus:ring-primary text-slate-500 dark:text-slate-400">
              <option>Zone: Toutes</option>
            </select>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Livreur
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Type Véhicule
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-center">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-center">
                    Livraisons
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-center">
                    Gains Totaux
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-center">
                    Note Moyenne
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      Aucun livreur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => {
                    const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase();
                    const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Sans nom';
                    return (
                      <tr
                        key={driver.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td
                          className="px-6 py-4 cursor-pointer"
                          onClick={(e) => {
                            // Ne pas ouvrir les détails si on clique sur le menu d'actions
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {(driver.profile_picture || driver.photo) ? (
                              <img
                                src={getImageUrl(driver.profile_picture || driver.photo)}
                                alt={fullName}
                                className="size-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary dark:text-blue-400 font-black text-xs"
                              style={{ display: (driver.profile_picture || driver.photo) ? 'none' : 'flex' }}
                            >
                              {initials || '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{fullName}</span>
                                {/* Indicateur de disponibilité */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  driver.delivery_status === 'available' 
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : driver.delivery_status === 'busy'
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                    : driver.delivery_status === 'on_break'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    driver.delivery_status === 'available' ? 'bg-emerald-500 animate-pulse' 
                                    : driver.delivery_status === 'busy' ? 'bg-amber-500'
                                    : driver.delivery_status === 'on_break' ? 'bg-blue-500'
                                    : 'bg-slate-400'
                                  }`}></span>
                                  {driver.delivery_status === 'available' ? 'Disponible' 
                                    : driver.delivery_status === 'busy' ? 'Occupé'
                                    : driver.delivery_status === 'on_break' ? 'Pause'
                                    : 'Hors ligne'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{driver.id?.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td 
                          className="px-6 py-4 cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">
                              {getVehicleIcon(driver.vehicle_type)}
                            </span>
                            <span className="text-sm text-slate-900 dark:text-white">{getVehicleLabel(driver.vehicle_type)}</span>
                          </div>
                        </td>
                        <td 
                          className="px-6 py-4 text-sm text-slate-900 dark:text-white cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          {driver.phone || 'N/A'}
                        </td>
                        <td 
                          className="px-6 py-4 text-center cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(driver.status)}`}
                          >
                            {getStatusLabel(driver.status)}
                          </span>
                        </td>
                        <td 
                          className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          {driver.total_deliveries || driver.completed_deliveries || 0}
                        </td>
                        <td 
                          className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          {driver.total_earnings ? `${Number.parseFloat(driver.total_earnings).toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                        </td>
                        <td 
                          className="px-6 py-4 text-center cursor-pointer"
                          onClick={(e) => {
                            if (showActionsMenu !== driver.id) {
                              handleViewDetails(driver.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {driver.average_rating ? Number.parseFloat(driver.average_rating).toFixed(1) : '0.0'}
                            </span>
                            <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                          </div>
                        </td>
                        <td 
                          className="px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'relative' }}
                        >
                          <div className="relative inline-block" style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowActionsMenu(showActionsMenu === driver.id ? null : driver.id);
                              }}
                              className="p-1 hover:text-primary transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Actions"
                              aria-label="Menu d'actions"
                              type="button"
                              id={`action-button-${driver.id}`}
                            >
                              <span className="material-symbols-outlined text-xl">more_vert</span>
                            </button>
                            {showActionsMenu === driver.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[9998] bg-transparent"
                                  onClick={() => setShowActionsMenu(null)}
                                  style={{ zIndex: 9998 }}
                                />
                                <div 
                                  className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-600 py-1"
                                  style={{ 
                                    position: 'fixed',
                                    zIndex: 9999,
                                    minWidth: '160px',
                                    maxWidth: '200px',
                                    display: 'block',
                                    visibility: 'visible',
                                    opacity: 1,
                                    backgroundColor: 'white',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  ref={(el) => {
                                    if (el && showActionsMenu === driver.id) {
                                      const button = document.getElementById(`action-button-${driver.id}`);
                                      if (button) {
                                        const buttonRect = button.getBoundingClientRect();
                                        const menuHeight = 120; // Hauteur approximative du menu (3 boutons)
                                        const menuWidth = 160;
                                        const viewportHeight = window.innerHeight;
                                        const viewportWidth = window.innerWidth;
                                        
                                        // Calculer la position horizontale (à droite du bouton)
                                        let left = buttonRect.right;
                                        let top = buttonRect.bottom + 4;
                                        
                                        // Si le menu dépasse à droite, l'afficher à gauche du bouton
                                        if (left + menuWidth > viewportWidth) {
                                          left = buttonRect.left - menuWidth;
                                        }
                                        
                                        // Si le menu dépasse en bas, l'afficher au-dessus du bouton
                                        if (top + menuHeight > viewportHeight) {
                                          top = buttonRect.top - menuHeight - 4;
                                        }
                                        
                                        // S'assurer que le menu ne dépasse pas en haut
                                        if (top < 0) {
                                          top = 4;
                                        }
                                        
                                        // S'assurer que le menu ne dépasse pas à gauche
                                        if (left < 0) {
                                          left = 4;
                                        }
                                        
                                        el.style.left = `${left}px`;
                                        el.style.top = `${top}px`;
                                        el.style.right = 'auto';
                                      }
                                    }
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      handleViewDetails(driver.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                    <span>Voir détails</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenEdit(driver, e)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    <span>Modifier</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenDelete(driver, e)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors whitespace-nowrap"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} sur {totalPages}
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value={10}>10 par page</option>
                  <option value={20}>20 par page</option>
                  <option value={50}>50 par page</option>
                  <option value={100}>100 par page</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">first_page</span>
                </button>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                
                {/* Numéros de pages */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-white'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Créer Livreur */}
        {showCreateModal && (
          <CreateDriverModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
          />
        )}

        {/* Modal Modifier Livreur */}
        {showEditModal && selectedDriver && (
          <EditDriverModal
            driver={selectedDriver}
            onClose={() => {
              setShowEditModal(false);
              setSelectedDriver(null);
            }}
            onSubmit={handleEdit}
            isLoading={updateMutation.isPending}
          />
        )}

        {/* Modal Supprimer Livreur */}
        {showDeleteModal && selectedDriver && (
          <DeleteDriverModal
            driver={selectedDriver}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedDriver(null);
            }}
            onConfirm={handleDelete}
            isLoading={deleteMutation.isPending}
          />
        )}
      </div>
    </Layout>
  );
};

// Modal pour créer un livreur
const CreateDriverModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    first_name: '',
    last_name: '',
    vehicle_type: 'moto',
    vehicle_plate: '',
    mobile_money_number: '',
    mobile_money_provider: 'orange_money',
    status: 'active',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nouveau Livreur</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Téléphone *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="+225 07 12 34 56 78"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mot de passe *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de véhicule *
              </label>
              <select
                required
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="moto">Moto</option>
                <option value="bike">Vélo</option>
                <option value="foot">Pied</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Plaque d'immatriculation
              </label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Numéro Mobile Money
              </label>
              <input
                type="text"
                value={formData.mobile_money_number}
                onChange={(e) => setFormData({ ...formData, mobile_money_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Opérateur Mobile Money
              </label>
              <select
                value={formData.mobile_money_provider}
                onChange={(e) => setFormData({ ...formData, mobile_money_provider: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="orange_money">Orange Money</option>
                <option value="mtn_money">MTN Money</option>
                <option value="moov_money">Moov Money</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Statut *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="active">Actif</option>
              <option value="pending">En attente</option>
              <option value="suspended">Suspendu</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal pour modifier un livreur
const EditDriverModal = ({ driver, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    first_name: driver.first_name || '',
    last_name: driver.last_name || '',
    vehicle_type: driver.vehicle_type || 'moto',
    vehicle_plate: driver.vehicle_plate || '',
    mobile_money_number: driver.mobile_money_number || '',
    mobile_money_provider: driver.mobile_money_provider || 'orange_money',
    status: driver.status || 'active',
    delivery_status: driver.delivery_status || 'offline',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Modifier Livreur</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de véhicule
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="moto">Moto</option>
                <option value="bike">Vélo</option>
                <option value="foot">Pied</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Plaque d'immatriculation
              </label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Numéro Mobile Money
              </label>
              <input
                type="text"
                value={formData.mobile_money_number}
                onChange={(e) => setFormData({ ...formData, mobile_money_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Opérateur Mobile Money
              </label>
              <select
                value={formData.mobile_money_provider}
                onChange={(e) => setFormData({ ...formData, mobile_money_provider: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="orange_money">Orange Money</option>
                <option value="mtn_money">MTN Money</option>
                <option value="moov_money">Moov Money</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="suspended">Suspendu</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Statut de livraison
              </label>
              <select
                value={formData.delivery_status}
                onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="offline">Hors ligne</option>
                <option value="available">Disponible</option>
                <option value="busy">Occupé</option>
                <option value="on_break">En pause</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal pour supprimer un livreur
const DeleteDriverModal = ({ driver, onClose, onConfirm, isLoading }) => {
  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'ce livreur';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Supprimer Livreur</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Êtes-vous sûr de vouloir supprimer <strong>{fullName}</strong> ?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Cette action est irréversible. Les données du livreur seront définitivement supprimées.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drivers;
