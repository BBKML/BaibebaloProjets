import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { restaurantsAPI } from '../api/restaurants';
import TableSkeleton from '../components/common/TableSkeleton';
import { getImageUrl } from '../utils/url';
import toast from 'react-hot-toast';

const Restaurants = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20,
  });
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(null);
  const menuRef = useRef(null);

  // Mutation pour suspendre un restaurant
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }) => restaurantsAPI.suspendRestaurant(id, reason),
    onSuccess: () => {
      toast.success('Restaurant suspendu avec succès');
      queryClient.invalidateQueries(['restaurants']);
      setShowSuspendModal(null);
      setSuspendReason('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suspension');
    },
  });

  // Mutation pour réactiver un restaurant
  const reactivateMutation = useMutation({
    mutationFn: (id) => restaurantsAPI.reactivateRestaurant(id),
    onSuccess: () => {
      toast.success('Restaurant réactivé avec succès');
      queryClient.invalidateQueries(['restaurants']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la réactivation');
    },
  });

  // Mutation pour supprimer un restaurant
  const deleteMutation = useMutation({
    mutationFn: (id) => restaurantsAPI.deleteRestaurant(id),
    onSuccess: () => {
      toast.success('Restaurant supprimé avec succès');
      queryClient.invalidateQueries(['restaurants']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurants', filters],
    queryFn: () => restaurantsAPI.getRestaurants(filters),
  });

  const restaurants = data?.data?.restaurants || [];
  const pagination = data?.data?.pagination || {};

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Restaurants</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez et validez les restaurants</p>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Restaurants</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez et validez les restaurants</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Info pagination en haut */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {pagination.total || restaurants.length} restaurant(s) trouvé(s)
            </span>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Restaurant</th>
                  <th className="px-6 py-4">Propriétaire</th>
                  <th className="px-6 py-4">Téléphone</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      Aucun restaurant trouvé
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {restaurant.logo || restaurant.banner ? (
                            <img 
                              src={getImageUrl(restaurant.logo || restaurant.banner)} 
                              alt={restaurant.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
                            style={{ display: restaurant.logo || restaurant.banner ? 'none' : 'flex' }}
                          >
                            <span className="material-symbols-outlined text-slate-400">restaurant</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {restaurant.name}
                              </p>
                              {/* Indicateur Ouvert/Fermé */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                restaurant.is_open 
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${restaurant.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {restaurant.is_open ? 'Ouvert' : 'Fermé'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{
                              typeof restaurant.address === 'object' 
                                ? (restaurant.address?.address_line || restaurant.address?.street || `${restaurant.address?.district || ''} ${restaurant.address?.city || ''}`.trim() || '')
                                : (restaurant.address || '')
                            }</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {restaurant.owner_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {restaurant.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          restaurant.status === 'pending' 
                            ? 'bg-semantic-amber/10 text-semantic-amber'
                            : restaurant.status === 'active'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500'
                            : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500'
                        }`}>
                          {restaurant.status === 'pending' ? 'En attente' : restaurant.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                        style={{ position: 'relative' }}
                      >
                        {restaurant.status === 'pending' ? (
                          <button
                            onClick={() => navigate(`/restaurants/${restaurant.id}/validate`)}
                            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                            type="button"
                          >
                            Valider
                          </button>
                        ) : (
                          <div className="relative inline-block" style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowActionsMenu(showActionsMenu === restaurant.id ? null : restaurant.id);
                              }}
                              className="p-1 hover:text-primary transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Actions"
                              aria-label="Menu d'actions"
                              type="button"
                              id={`action-button-${restaurant.id}`}
                            >
                              <span className="material-symbols-outlined text-xl">more_vert</span>
                            </button>
                            {showActionsMenu === restaurant.id && (
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
                                    if (el && showActionsMenu === restaurant.id) {
                                      const button = document.getElementById(`action-button-${restaurant.id}`);
                                      if (button) {
                                        const buttonRect = button.getBoundingClientRect();
                                        const menuHeight = 160; // Hauteur approximative du menu (4 boutons)
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
                                      navigate(`/restaurants/${restaurant.id}`);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                    <span>Voir détails</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      navigate(`/restaurants/${restaurant.id}/edit`);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    <span>Modifier</span>
                                  </button>
                                  {restaurant.status === 'active' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActionsMenu(null);
                                        setShowSuspendModal(restaurant.id);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors whitespace-nowrap"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-lg">block</span>
                                      <span>Suspendre</span>
                                    </button>
                                  )}
                                  {restaurant.status === 'suspended' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActionsMenu(null);
                                        if (window.confirm('Êtes-vous sûr de vouloir réactiver ce restaurant ?')) {
                                          reactivateMutation.mutate(restaurant.id);
                                        }
                                      }}
                                      disabled={reactivateMutation.isPending}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center gap-3 transition-colors whitespace-nowrap disabled:opacity-50"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-lg">check_circle</span>
                                      <span>{reactivateMutation.isPending ? 'Réactivation...' : 'Réactiver'}</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce restaurant ? Cette action est irréversible.')) {
                                        deleteMutation.mutate(restaurant.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors whitespace-nowrap disabled:opacity-50"
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    <span>{deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page {filters.page} sur {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">first_page</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                
                {/* Numéros de pages */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (filters.page <= 3) {
                    pageNum = i + 1;
                  } else if (filters.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = filters.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setFilters({ ...filters, page: pageNum })}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        filters.page === pageNum
                          ? 'bg-primary text-white'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.pages })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de suspension */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Suspendre le restaurant
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Veuillez indiquer la raison de la suspension. Cette information sera enregistrée.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Raison de la suspension..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSuspendModal(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                type="button"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!suspendReason.trim()) {
                    toast.error('Veuillez indiquer une raison');
                    return;
                  }
                  suspendMutation.mutate({ id: showSuspendModal, reason: suspendReason });
                }}
                disabled={suspendMutation.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                type="button"
              >
                {suspendMutation.isPending ? 'Suspension...' : 'Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Restaurants;
