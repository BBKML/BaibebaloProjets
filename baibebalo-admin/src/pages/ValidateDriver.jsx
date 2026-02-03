import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import driversAPI from '../api/drivers';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/url';

// Composant pour afficher un document
const DocumentCard = ({ title, url, icon }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const imageUrl = url ? getImageUrl(url) : null;

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
        </div>
        {imageUrl ? (
          <div 
            className="relative cursor-pointer group"
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center">
              <span className="material-symbols-outlined text-slate-400">broken_image</span>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">
              ✓ Uploadé
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
            <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">cloud_upload</span>
            <span className="text-xs text-slate-400">Non fourni</span>
          </div>
        )}
      </div>

      {/* Modal zoom */}
      {isZoomed && imageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
              {title}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ValidateDriver = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', { status: 'pending' }],
    queryFn: () => driversAPI.getDrivers({ status: 'pending', limit: 1 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => driversAPI.approveDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success('Candidature approuvée avec succès');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || 'Erreur lors de l\'approbation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => driversAPI.rejectDriver(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success('Candidature rejetée');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || 'Erreur lors du rejet');
    },
  });

  const requestInfoMutation = useMutation({
    mutationFn: ({ id, message }) => driversAPI.requestInfo(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success('Demande d\'informations envoyée');
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || 'Erreur lors de l\'envoi');
    },
  });

  const drivers = data?.data?.delivery_persons || [];
  const driver = drivers[0] || null;
  const name = driver
    ? [driver.first_name, driver.last_name].filter(Boolean).join(' ').trim() || 'Livreur'
    : '';

  const handleApprove = () => {
    if (!driver?.id) return;
    if (globalThis.confirm(`Approuver la candidature de ${name} ?`)) {
      approveMutation.mutate(driver.id);
    }
  };

  const handleReject = () => {
    if (!driver?.id) return;
    const reason = globalThis.prompt(`Raison du rejet (optionnel) pour ${name} :`);
    if (reason !== null) {
      rejectMutation.mutate({ id: driver.id, reason: reason || undefined });
    }
  };

  const handleRequestInfo = () => {
    if (!driver?.id) return;
    const message = globalThis.prompt(`Quel(s) document(s) ou information(s) demander à ${name} ?`);
    if (message && message.trim()) {
      requestInfoMutation.mutate({ id: driver.id, message: message.trim() });
    } else if (message !== null) {
      toast.error('Veuillez indiquer les informations demandées');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Validation de Nouveau Livreur
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chargement…</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 animate-pulse">
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6" />
            <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Erreur</h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error.message || 'Impossible de charger les livreurs en attente.'}
            </p>
            <button
              onClick={() => navigate('/drivers')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
            >
              Retour aux livreurs
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!driver) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Validation de Nouveau Livreur
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Aucun livreur en attente</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Il n’y a actuellement aucun livreur en attente de validation.
            </p>
            <button
              onClick={() => navigate('/drivers')}
              className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:brightness-110"
            >
              Voir les livreurs
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/drivers')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Validation de Nouveau Livreur
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Phase 3 sur 4 : Validation des documents
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Profil du Livreur
            </h2>
            <div className="flex items-start gap-6">
              <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-black">
                {name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join('')
                  .slice(0, 2) || '?'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <span className="material-symbols-outlined text-lg">motorcycle</span>
                  <span>
                    Type de véhicule : {driver.vehicle_type || 'Non renseigné'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>Licence / Plaque : {driver.vehicle_plate || '—'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Téléphone
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {driver.phone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Email
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {driver.email || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Adresse
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {typeof driver.address === 'object' 
                        ? (driver.address?.address_line || driver.address?.street || `${driver.address?.district || ''} ${driver.address?.city || ''}`.trim() || '—')
                        : (driver.address || '—')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Vérification des Documents
            </h2>
            
            {/* Documents du livreur */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CNI / Passeport - Recto */}
              <DocumentCard
                title="CNI / Passeport - Recto"
                url={driver.id_card_recto}
                icon="badge"
              />
              {/* CNI / Passeport - Verso */}
              <DocumentCard
                title="CNI / Passeport - Verso"
                url={driver.id_card_verso}
                icon="badge"
              />
              {/* Permis - Recto */}
              <DocumentCard
                title="Permis de conduire - Recto"
                url={driver.driver_license_recto}
                icon="directions_car"
              />
              {/* Permis - Verso */}
              <DocumentCard
                title="Permis de conduire - Verso"
                url={driver.driver_license_verso}
                icon="directions_car"
              />
              {/* Carte grise - Recto */}
              <DocumentCard
                title="Carte grise - Recto"
                url={driver.vehicle_registration_recto}
                icon="description"
              />
              {/* Carte grise - Verso */}
              <DocumentCard
                title="Carte grise - Verso"
                url={driver.vehicle_registration_verso}
                icon="description"
              />
              {/* Assurance */}
              <DocumentCard
                title="Attestation d'assurance"
                url={driver.insurance_document}
                icon="verified_user"
              />
              {/* Photo de profil */}
              <DocumentCard
                title="Photo de profil"
                url={driver.profile_photo}
                icon="person"
              />
            </div>

            {/* Avertissement si documents manquants */}
            {!driver.id_card_recto && !driver.driver_license_recto && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-amber-800 dark:text-amber-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  Aucun document n'a été uploadé par ce livreur.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleRequestInfo}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold transition-colors"
            >
              Demander infos
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors shadow-sm"
              >
                {rejectMutation.isPending ? '…' : 'REJETER'}
              </button>
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors shadow-sm"
              >
                {approveMutation.isPending ? '…' : 'APPROUVER'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidateDriver;
