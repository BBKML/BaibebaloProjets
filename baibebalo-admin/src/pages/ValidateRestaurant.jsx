import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { restaurantsAPI } from '../api/restaurants';
import TableSkeleton from '../components/common/TableSkeleton';
import { getImageUrl } from '../utils/url';
import toast from 'react-hot-toast';

const ValidateRestaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantsAPI.getRestaurantDetails(id),
    retry: 2,
  });

  const validateMutation = useMutation({
    mutationFn: () => restaurantsAPI.validateRestaurant(id),
    onSuccess: () => {
      toast.success('Restaurant approuvé avec succès');
      queryClient.invalidateQueries(['restaurant', id]);
      queryClient.invalidateQueries(['restaurants']);
      navigate('/restaurants');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => restaurantsAPI.rejectRestaurant(id, reason),
    onSuccess: () => {
      toast.success('Restaurant rejeté');
      queryClient.invalidateQueries(['restaurant', id]);
      queryClient.invalidateQueries(['restaurants']);
      navigate('/restaurants');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors du rejet');
    },
  });

  const requestCorrectionsMutation = useMutation({
    mutationFn: (message) => restaurantsAPI.requestCorrections(id, message),
    onSuccess: () => {
      toast.success('Demande de corrections envoyée');
      setRejectionReason('');
      queryClient.invalidateQueries(['restaurant', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/restaurants')}
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
          <p className="text-red-700 dark:text-red-300">{error.message || 'Erreur lors du chargement'}</p>
          <button
            onClick={() => navigate('/restaurants')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux restaurants
          </button>
        </div>
      </Layout>
    );
  }

  const restaurant = data?.data?.restaurant || {};
  const pendingDays = restaurant.pending_days || 0;

  const handleApprove = () => {
    if (globalThis.confirm('Êtes-vous sûr de vouloir approuver ce restaurant ?')) {
      validateMutation.mutate();
    }
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      if (globalThis.confirm('Êtes-vous sûr de vouloir rejeter ce restaurant ?')) {
        rejectMutation.mutate(rejectionReason);
      }
    } else {
      toast.error('Veuillez indiquer une raison de rejet');
    }
  };

  const handleRequestCorrections = () => {
    if (rejectionReason.trim()) {
      if (globalThis.confirm('Envoyer une demande de corrections au restaurant ?')) {
        requestCorrectionsMutation.mutate(rejectionReason);
      }
    } else {
      toast.error('Veuillez indiquer les corrections demandées');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/restaurants')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Validation de Restaurant
              </h1>
              {pendingDays > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-semantic-amber/10 text-semantic-amber mt-2">
                  EN ATTENTE DEPUIS {pendingDays} JOUR{pendingDays > 1 ? 'S' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Restaurant Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          {/* Images du restaurant */}
          <div className="mb-6">
            {/* Banner */}
            {restaurant.banner && (
              <div className="mb-4 rounded-xl overflow-hidden">
                <img 
                  src={getImageUrl(restaurant.banner)} 
                  alt={`Banner de ${restaurant.name}`}
                  className="w-full h-48 object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            
            <div className="flex items-center gap-4">
              {/* Logo */}
              {restaurant.logo ? (
                <img 
                  src={getImageUrl(restaurant.logo)} 
                  alt={`Logo de ${restaurant.name}`}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
                style={{ display: restaurant.logo ? 'none' : 'flex' }}
              >
                <span className="material-symbols-outlined text-3xl text-slate-400">restaurant</span>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {restaurant.name || 'N/A'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{restaurant.category || 'Restaurant'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Documents Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                Documents
              </h3>
              <div className="space-y-4">
                {/* RCCM */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">description</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">RCCM</p>
                      <p className="text-xs text-slate-500">Registre du Commerce</p>
                    </div>
                    {restaurant.documents?.rccm ? (
                      <a 
                        href={restaurant.documents.rccm} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/70"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </a>
                    ) : (
                      <span className="text-xs text-red-500">Manquant</span>
                    )}
                  </div>
                  {restaurant.documents?.rccm && (
                    <div className="mt-3">
                      <img 
                        src={restaurant.documents.rccm} 
                        alt="Document RCCM" 
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>

                {/* CNI Recto */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">CNI Recto</p>
                      <p className="text-xs text-slate-500">Carte d'identité (face avant)</p>
                    </div>
                    {(restaurant.id_card_front || restaurant.documents?.id || restaurant.documents?.cni) ? (
                      <a 
                        href={getImageUrl(restaurant.id_card_front || restaurant.documents?.id || restaurant.documents?.cni)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/70"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </a>
                    ) : (
                      <span className="text-xs text-red-500">Manquant</span>
                    )}
                  </div>
                  {(restaurant.id_card_front || restaurant.documents?.id || restaurant.documents?.cni) && (
                    <div className="mt-3">
                      <img 
                        src={getImageUrl(restaurant.id_card_front || restaurant.documents?.id || restaurant.documents?.cni)} 
                        alt="CNI Recto" 
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>

                {/* CNI Verso */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">CNI Verso</p>
                      <p className="text-xs text-slate-500">Carte d'identité (face arrière)</p>
                    </div>
                    {restaurant.id_card_back ? (
                      <a 
                        href={getImageUrl(restaurant.id_card_back)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/70"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </a>
                    ) : (
                      <span className="text-xs text-red-500">Manquant</span>
                    )}
                  </div>
                  {restaurant.id_card_back && (
                    <div className="mt-3">
                      <img 
                        src={getImageUrl(restaurant.id_card_back)} 
                        alt="CNI Verso" 
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>

                {/* Photos du Restaurant */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">photo_camera</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Photos du Restaurant</p>
                      <p className="text-xs text-slate-500">
                        {restaurant.photos?.length || 0} photo{restaurant.photos?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {restaurant.photos && restaurant.photos.length > 0 ? (
                      <span className="text-xs text-emerald-500 font-semibold">OK</span>
                    ) : (
                      <span className="text-xs text-red-500">Manquant</span>
                    )}
                  </div>
                  {restaurant.photos && restaurant.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {restaurant.photos.map((photo, index) => (
                        <a 
                          key={index} 
                          href={photo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <img 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informations de l'entreprise */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                Informations de l'entreprise
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Type d'entreprise
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {restaurant.business_type || 'Restaurant Traditionnel'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Adresse
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {typeof restaurant.address === 'object' 
                      ? (restaurant.address?.address_line || restaurant.address?.street || `${restaurant.address?.district || ''} ${restaurant.address?.city || ''}`.trim() || 'N/A')
                      : (restaurant.address || 'N/A')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Téléphone
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {restaurant.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Compte Mobile Money
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {restaurant.mobile_money_provider || 'N/A'} - {restaurant.mobile_money_number || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4">
            <button
              onClick={handleApprove}
              disabled={validateMutation.isLoading}
              className="flex-1 min-w-[200px] px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
            >
              <span className="material-symbols-outlined">check_circle</span>
              APPROUVER
            </button>
            <button
              onClick={handleReject}
              disabled={rejectMutation.isLoading}
              className="flex-1 min-w-[200px] px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
            >
              <span className="material-symbols-outlined">cancel</span>
              REJETER
            </button>
            <button
              onClick={handleRequestCorrections}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold"
            >
              Demander corrections
            </button>
          </div>

          {/* Rejection Reason Input */}
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <label htmlFor="rejection-reason" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Raison (pour rejet ou corrections)
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Indiquez la raison..."
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-sm min-h-[100px]"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidateRestaurant;
