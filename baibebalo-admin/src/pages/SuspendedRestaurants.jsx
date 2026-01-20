import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import { restaurantsAPI } from '../api/restaurants';
import TableSkeleton from '../components/common/TableSkeleton';
import { formatDateShort } from '../utils/format';

const SuspendedRestaurants = () => {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended', 'pending'
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Charger les restaurants avec filtre de statut
  const { data, isLoading } = useQuery({
    queryKey: ['restaurants', currentPage, statusFilter],
    queryFn: () => restaurantsAPI.getRestaurants({ 
      page: currentPage, 
      limit: itemsPerPage,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
    retry: 2,
  });

  // Mutation pour réactiver un restaurant
  const reactivateMutation = useMutation({
    mutationFn: (id) => restaurantsAPI.reactivateRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurants']);
      toast.success('Restaurant réactivé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la réactivation');
    },
  });

  const restaurants = data?.data?.restaurants || [];
  const pagination = data?.data?.pagination || { total: 0, pages: 0 };

  // Debug: Afficher les restaurants dans la console
  if (restaurants.length > 0 && import.meta.env.DEV) {
    console.log('🔍 Restaurants chargés:', restaurants.map(r => ({ id: r.id, name: r.name, status: r.status, statusType: typeof r.status })));
    console.log('🔍 Filtre actuel:', statusFilter);
  }

  const handleReactivate = (restaurantId, restaurantName) => {
    setOpenMenuId(null);
    if (window.confirm(`Êtes-vous sûr de vouloir réactiver le restaurant "${restaurantName}" ?`)) {
      reactivateMutation.mutate(restaurantId);
    }
  };

  const handleViewDetails = (restaurantId) => {
    setOpenMenuId(null);
    navigate(`/restaurants/${restaurantId}`);
  };

  const handleEdit = (restaurantId) => {
    setOpenMenuId(null);
    navigate(`/restaurants/${restaurantId}/edit`);
  };

  const handleDelete = (restaurantId, restaurantName) => {
    setOpenMenuId(null);
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le restaurant "${restaurantName}" ? Cette action est irréversible.`)) {
      // TODO: Implémenter la suppression
      toast.error('La suppression n\'est pas encore implémentée');
    }
  };

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'ACTIF', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
      suspended: { label: 'SUSPENDU', class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
      pending: { label: 'EN ATTENTE', class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
      rejected: { label: 'REJETÉ', class: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400' },
    };
    return statusConfig[status] || { label: status?.toUpperCase() || 'N/A', class: 'bg-slate-100 text-slate-700' };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-80 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Filtre Skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={5} columns={5} />
        </div>
      </Layout>
    );
  }

  const totalPages = pagination.pages || 1;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Liste des Restaurants
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gérez et validez les restaurants
            </p>
          </div>
        </div>

        {/* Filtre de statut */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Statut:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="pending">En attente</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    RESTAURANT
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    PROPRIÉTAIRE
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    TÉLÉPHONE
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    STATUT
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-400">restaurant</span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          Aucun restaurant trouvé
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => {
                    const statusBadge = getStatusBadge(restaurant.status);
                    // Normaliser le statut pour la comparaison (en minuscules)
                    const normalizedStatus = (restaurant.status || '').toLowerCase().trim();
                    const isSuspended = normalizedStatus === 'suspended';
                    // Afficher le bouton si le restaurant est suspendu OU si on filtre par "suspended"
                    // TEMPORAIRE: Afficher toujours le bouton pour tester
                    const showReactivateButton = true; // isSuspended || statusFilter === 'suspended';
                    
                    // Debug pour chaque restaurant
                    if (import.meta.env.DEV && restaurants.length <= 5) {
                      console.log(`🍽️ Restaurant "${restaurant.name}":`, {
                        status: restaurant.status,
                        normalizedStatus,
                        isSuspended,
                        statusFilter,
                        showReactivateButton,
                        allKeys: Object.keys(restaurant)
                      });
                    }
                    
                    return (
                      <tr
                        key={restaurant.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-400">restaurant</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-primary dark:text-primary">{restaurant.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{restaurant.address || restaurant.location || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                          {restaurant.owner_name || restaurant.owner || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                          {restaurant.phone || restaurant.phone_number || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative flex items-center justify-end gap-2">
                            {/* Bouton Réactiver pour les restaurants suspendus */}
                            {showReactivateButton && (
                              <button
                                onClick={() => handleReactivate(restaurant.id, restaurant.name)}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold transition-colors shadow-sm"
                              >
                                Réactiver
                              </button>
                            )}
                            {/* Menu d'actions */}
                            <div className="relative" ref={el => menuRefs.current[restaurant.id] = el}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === restaurant.id ? null : restaurant.id)}
                                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                              {/* Dropdown Menu */}
                              {openMenuId === restaurant.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 py-1">
                                  <button
                                    onClick={() => handleViewDetails(restaurant.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                    <span>Voir détails</span>
                                  </button>
                                  <button
                                    onClick={() => handleEdit(restaurant.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    <span>Modifier</span>
                                  </button>
                                  {showReactivateButton && (
                                    <button
                                      onClick={() => handleReactivate(restaurant.id, restaurant.name)}
                                      className="w-full px-4 py-2 text-left text-sm text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 flex items-center gap-2 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-lg">check_circle</span>
                                      <span>Réactiver</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(restaurant.id, restaurant.name)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              )}
                            </div>
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
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Précédent
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-2 text-slate-500 dark:text-slate-400">...</span>
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Suivant
                </button>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Total: {pagination.total || 0} restaurant(s)
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SuspendedRestaurants;
