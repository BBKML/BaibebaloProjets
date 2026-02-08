import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

const AccountSettings = () => {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [currentEmail, setCurrentEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [profilePicture, setProfilePicture] = useState(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    loadAccountData();
    loadSessions();
  }, []);

  const loadAccountData = async () => {
    try {
      // Récupérer les infos de l'admin depuis le localStorage ou un endpoint
      const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
      setCurrentEmail(adminData.email || 'admin@ba-platform.com');
      setIsEmailVerified(adminData.email_verified || false);
      setProfilePicture(adminData.profile_picture || null);
    } catch (error) {
      console.error('Erreur chargement données compte:', error);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setIsUploadingPicture(true);
    try {
      const response = await authAPI.uploadProfilePicture(file);
      if (response.success) {
        const newProfilePicture = response.data.profile_picture || response.data.admin?.profile_picture;
        console.log('✅ Upload réussi - Nouvelle photo de profil:', newProfilePicture);
        console.log('📦 Données complètes de la réponse:', response.data);
        
        // Vérifier que l'URL est valide
        if (!newProfilePicture) {
          console.error('❌ Aucune URL de photo retournée');
          toast.error('Erreur: Aucune URL de photo retournée par le serveur');
          return;
        }
        
        setImageError(false); // Réinitialiser l'erreur
        setProfilePicture(newProfilePicture);
        // Mettre à jour le localStorage
        const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
        adminData.profile_picture = newProfilePicture;
        if (response.data.admin) {
          // Mettre à jour toutes les données admin si disponibles
          Object.assign(adminData, response.data.admin);
        }
        localStorage.setItem('admin', JSON.stringify(adminData));
        // Forcer le rechargement de la page pour mettre à jour le Header
        // (Alternative: utiliser un événement personnalisé ou un contexte React)
        window.dispatchEvent(new Event('adminDataUpdated'));
        toast.success(response.message || 'Photo de profil mise à jour avec succès');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message 
        || 'Erreur lors de l\'upload de la photo';
      console.error('Erreur upload photo:', error);
      toast.error(errorMessage);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!profilePicture) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    try {
      const response = await authAPI.deleteProfilePicture();
      if (response.success) {
        setProfilePicture(null);
        // Mettre à jour le localStorage
        const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
        adminData.profile_picture = null;
        
        // Si le backend retourne les données admin complètes, les utiliser
        if (response.data?.admin) {
          Object.assign(adminData, response.data.admin);
        }
        
        localStorage.setItem('admin', JSON.stringify(adminData));
        
        // Déclencher l'événement pour mettre à jour le Header immédiatement
        window.dispatchEvent(new Event('adminDataUpdated'));
        
        toast.success('Photo de profil supprimée avec succès');
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la suppression de la photo');
    }
  };

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await authAPI.getActiveSessions();
      if (response.success && response.data.sessions) {
        // Mapper les sessions au format attendu
        const mappedSessions = response.data.sessions.map((session, index) => ({
          id: session.id || `session-${index}`,
          device: session.device || 'Web Browser',
          deviceIcon: session.deviceIcon || 'computer',
          location: session.location || 'Korhogo, Côte d\'Ivoire',
          ip: session.ip || '192.168.1.45',
          isCurrent: session.isCurrent || false,
          lastActive: session.lastActive || 'En ligne maintenant',
          status: session.status || 'online',
        }));
        setActiveSessions(mappedSessions);
      }
    } catch (error) {
      console.error('Erreur chargement sessions:', error);
      // En cas d'erreur, utiliser des données par défaut
      setActiveSessions([
        {
          id: '1',
          device: 'Web Browser',
          deviceIcon: 'computer',
          location: 'Korhogo, Côte d\'Ivoire',
          ip: '192.168.1.45',
          isCurrent: true,
          lastActive: 'En ligne maintenant',
          status: 'online',
        },
      ]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const response = await authAPI.updateEmail(newEmail);
      if (response.success) {
        // Mettre à jour le state local
        const updatedEmail = response.data?.email || newEmail;
        setCurrentEmail(updatedEmail);
        setIsEmailVerified(false); // Nécessite nouvelle vérification
        
        // Mettre à jour le localStorage pour que le Header affiche le nouvel email
        const adminData = JSON.parse(localStorage.getItem('admin') || '{}');
        adminData.email = updatedEmail;
        
        // Si le backend retourne les données admin complètes, les utiliser
        if (response.data?.admin) {
          Object.assign(adminData, response.data.admin);
        }
        
        localStorage.setItem('admin', JSON.stringify(adminData));
        
        // Déclencher l'événement pour mettre à jour le Header immédiatement
        window.dispatchEvent(new Event('adminDataUpdated'));
        
        toast.success(response.message || 'Email mis à jour. Un lien de vérification a été envoyé à la nouvelle adresse.');
        setNewEmail('');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Erreur lors de la mise à jour de l\'email';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await authAPI.revokeSession(sessionId);
      toast.success('Session révoquée avec succès');
      // Recharger les sessions
      loadSessions();
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Erreur lors de la révocation de la session';
      toast.error(errorMessage);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await authAPI.logoutAll();
      toast.success('Déconnexion de tous les appareils réussie');
      // Recharger les sessions
      loadSessions();
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Erreur lors de la déconnexion';
      toast.error(errorMessage);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Demander confirmation avec mot de passe
      const password = prompt('Entrez votre mot de passe pour confirmer la suppression:');
      if (!password) {
        return;
      }

      await authAPI.deleteAccount(password);
      toast.success('Compte supprimé avec succès');
      // Déconnexion et redirection
      authAPI.logout();
      navigate('/login');
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Erreur lors de la suppression du compte';
      toast.error(errorMessage);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <li>
              <button onClick={() => navigate('/')} className="hover:text-primary">
                Dashboard
              </button>
            </li>
            <li className="text-slate-400">/</li>
            <li>
              <button onClick={() => navigate('/settings/platform')} className="hover:text-primary">
                Paramètres
              </button>
            </li>
            <li className="text-slate-400">/</li>
            <li className="text-slate-900 dark:text-white font-medium">Mon Compte</li>
          </ol>
        </nav>

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Modifier mon Compte & <span className="text-primary">Sessions</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gérez vos informations de connexion, sécurisez vos accès et contrôlez vos sessions actives sur la plateforme Ba.
          </p>
        </div>

        {/* Section Photo de Profil */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Photo de Profil</h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Aperçu de la photo */}
            <div className="relative">
              {profilePicture && !imageError ? (
                <img
                  src={profilePicture}
                  alt="Photo de profil"
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                  onError={(e) => {
                    console.error('❌ Erreur chargement image:', profilePicture);
                    console.error('Erreur détaillée:', e);
                    setImageError(true);
                    toast.error('Impossible de charger l\'image. Vérifiez l\'URL: ' + profilePicture);
                  }}
                  onLoad={() => {
                    console.log('✅ Image chargée avec succès:', profilePicture);
                    setImageError(false);
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-700">
                  <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                </div>
              )}
              {imageError && profilePicture && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-full">
                  <span className="text-xs text-red-600 dark:text-red-400">Erreur</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  disabled={isUploadingPicture}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploadingPicture ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      <span>Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">upload</span>
                      <span>{profilePicture ? 'Changer la photo' : 'Ajouter une photo'}</span>
                    </>
                  )}
                </span>
              </label>

              {profilePicture && (
                <button
                  onClick={handleDeleteProfilePicture}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                  <span>Supprimer la photo</span>
                </button>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formats acceptés: JPG, PNG, GIF, WEBP (max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Section Informations de Connexion */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">key</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Informations de Connexion</h2>
          </div>

          {/* Email actuel */}
          <div className="mb-6">
            <div className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              EMAIL ACTUEL
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-900 dark:text-white font-medium">{currentEmail}</span>
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-full text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Vérifié
                </span>
              )}
            </div>
          </div>

          {/* Nouvel email */}
          <div className="mb-6">
            <label htmlFor="new-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nouvel Email
            </label>
            <div className="flex gap-3">
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="nouvel-email@exemple.com"
              />
              <button
                onClick={handleUpdateEmail}
                disabled={isUpdatingEmail || !newEmail}
                className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingEmail ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 flex gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 flex-shrink-0">info</span>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Changer votre adresse email nécessitera une nouvelle vérification par lien envoyé à la nouvelle adresse. Votre session actuelle restera active.
            </p>
          </div>

          {/* Lien vers réinitialisation de mot de passe */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigate('/settings/account/reset-password')}
              className="text-primary hover:text-primary/80 font-semibold text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">lock_reset</span>
              <span>Changer le mot de passe</span>
            </button>
          </div>
        </div>

        {/* Section Sessions Actives */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">devices</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sessions Actives</h2>
            </div>
            <button
              onClick={handleLogoutAll}
              className="text-primary hover:text-primary/80 font-semibold text-sm flex items-center gap-1"
            >
              <span>→</span>
              <span>Se déconnecter de tous les appareils</span>
            </button>
          </div>

          <div className="space-y-4">
            {isLoadingSessions ? (
              <div className="text-center py-8 text-slate-500">Chargement des sessions...</div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Aucune session active</div>
            ) : (
              activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${session.isCurrent ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <span className={`material-symbols-outlined text-2xl ${session.isCurrent ? 'text-primary' : 'text-slate-400'}`}>
                      {session.deviceIcon}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{session.device}</span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                          CETTE SESSION
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {session.location} • IP: {session.ip}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {session.isCurrent ? (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {session.lastActive}
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{session.lastActive}</span>
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                      >
                        Révoquer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Section Zone de Danger */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-slate-900 dark:text-white">warning</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">ZONE DE DANGER</h2>
          </div>
          
          <p className="text-slate-700 dark:text-slate-300 mb-6">
            La suppression de votre compte est <strong>permanente</strong>. Toutes vos données, projets et accès seront immédiatement révoqués sans possibilité de récupération.
          </p>

          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Oui, supprimer définitivement
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition-colors border-2 border-white dark:border-slate-600 uppercase"
            >
              Supprimer définitivement le compte
            </button>
          )}
        </div>

        {/* Footer avec informations système */}
        <div className="mt-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">SECURITY LEVEL: HIGH</span>
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-primary"></div>
            <div className="w-1 h-4 bg-primary"></div>
            <div className="w-1 h-4 bg-primary"></div>
          </div>
          <span className="font-semibold">SYSTEM V3.4.2</span>
        </div>
      </div>
    </Layout>
  );
};

export default AccountSettings;
