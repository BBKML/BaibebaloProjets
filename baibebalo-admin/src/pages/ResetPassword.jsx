import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculer la force du mot de passe
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordStrength < 2) {
      toast.error('Le mot de passe doit être plus fort');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword(formData.currentPassword, formData.newPassword);
      toast.success('Mot de passe mis à jour avec succès');
      navigate('/settings/account');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 1) return 'Faible';
    if (passwordStrength === 2) return 'Moyen';
    if (passwordStrength === 3) return 'Fort';
    return 'Très fort';
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <li>
              <button onClick={() => navigate('/settings/account')} className="hover:text-primary">
                Paramètres
              </button>
            </li>
            <li className="text-slate-400">/</li>
            <li>
              <button onClick={() => navigate('/settings/account')} className="hover:text-primary">
                Mon Compte
              </button>
            </li>
            <li className="text-slate-400">/</li>
            <li className="text-slate-900 dark:text-white font-medium">Réinitialisation de Mot de Passe</li>
          </ol>
        </nav>

        {/* Formulaire */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Réinitialisation de Mot de Passe
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Gérez la sécurité de votre compte administrateur Ba
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mot de passe actuel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                MOT DE PASSE ACTUEL
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <span className="material-symbols-outlined">
                    {showPasswords.current ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  NOUVEAU MOT DE PASSE
                </label>
                {formData.newPassword && (
                  <span className={`text-xs font-bold ${passwordStrength >= 2 ? 'text-primary' : 'text-red-500'}`}>
                    {getStrengthLabel()}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Entrez votre nouveau mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <span className="material-symbols-outlined">
                    {showPasswords.new ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              
              {/* Barre de force du mot de passe */}
              {formData.newPassword && (
                <div className="mt-3">
                  <div className="flex gap-1 h-1.5">
                    <div className={`flex-1 rounded-full ${passwordStrength >= 1 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength >= 2 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength >= 3 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Utilisez au moins 12 caractères, des chiffres et des symboles.
                  </p>
                </div>
              )}
            </div>

            {/* Confirmer le nouveau mot de passe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                CONFIRMER LE NOUVEAU MOT DE PASSE
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <span className="material-symbols-outlined">
                    {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Boutons */}
            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">sync</span>
                {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/settings/account')}
                className="text-center text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                Annuler et revenir
              </button>
            </div>
          </form>
        </div>

        {/* Footer avec icônes */}
        <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 dark:text-slate-600">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-2xl">lock</span>
            <span className="text-xs font-medium">ENCRYPTÉ</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-2xl">shield</span>
            <span className="text-xs font-medium">SÉCURISÉ</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-2xl">history</span>
            <span className="text-xs font-medium">HISTORIQUE</span>
          </div>
        </div>
        
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          © 2024 Ba Inc. Panneau d'administration sécurisé.
        </p>
      </div>
    </Layout>
  );
};

export default ResetPassword;
