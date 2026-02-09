import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';
import logoImage from '../assets/Baibebalo_logo_sans_fond.png';

const ResetPasswordFromEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Récupérer et décoder les paramètres de l'URL
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  // Décoder l'email si nécessaire (pour gérer les emails encodés comme bookeleblan%40gmail.com)
  const email = emailParam ? decodeURIComponent(emailParam) : null;
  
  // Log pour déboguer
  useEffect(() => {
    console.log('[ResetPasswordFromEmail] Location:', location.pathname, location.search);
    console.log('[ResetPasswordFromEmail] Search params:', Object.fromEntries(searchParams.entries()));
  }, [location, searchParams]);
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isValidToken, setIsValidToken] = useState(true);

  // Vérifier que le token et l'email sont présents
  useEffect(() => {
    console.log('[ResetPasswordFromEmail] Paramètres URL:', { token, email, emailParam });
    
    if (!token || !email) {
      console.warn('[ResetPasswordFromEmail] Token ou email manquant:', { token: !!token, email: !!email });
      setIsValidToken(false);
      toast.error('Lien de réinitialisation invalide. Veuillez vérifier que le lien est complet.');
    } else {
      console.log('[ResetPasswordFromEmail] Token et email présents, formulaire prêt');
      setIsValidToken(true);
    }
  }, [token, email, emailParam]);

  // Calculer la force du mot de passe
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
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

  // Réinitialisation du mot de passe
  const resetPasswordMutation = useMutation({
    mutationFn: ({ email, token, newPassword }) => 
      authAPI.resetPassword(email, token, newPassword),
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé avec succès !');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error?.message || 'Erreur lors de la réinitialisation';
      toast.error(errorMessage);
      
      // Si le token est expiré, rediriger vers forgot-password
      if (error.response?.data?.error?.code === 'TOKEN_EXPIRED' || 
          error.response?.data?.error?.code === 'INVALID_TOKEN') {
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !email) {
      toast.error('Lien de réinitialisation invalide');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordStrength < 2) {
      toast.error('Le mot de passe est trop faible. Utilisez des majuscules, minuscules et chiffres.');
      return;
    }

    resetPasswordMutation.mutate({
      email,
      token,
      newPassword: formData.newPassword,
    });
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
    return 'bg-green-500';
  };

  if (!isValidToken || !token || !email) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lien invalide</h2>
          <p className="text-gray-600 mb-6">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-[#FF6B35] text-white font-semibold rounded-lg hover:bg-[#FF6B35]/90 transition-colors"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <span className="text-5xl md:text-6xl lg:text-7xl font-bold">
              <span className="text-[#FF6B35]">Ba</span>
              <span className="text-black">ibebalo</span>
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Réinitialiser le mot de passe
          </h2>
          <p className="text-sm text-gray-600 text-center mb-8">
            Définissez un nouveau mot de passe pour votre compte administrateur
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nouveau mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                {formData.newPassword && (
                  <span className={`text-xs font-bold ${passwordStrength >= 2 ? 'text-green-600' : 'text-red-500'}`}>
                    {getStrengthLabel()}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  placeholder="Minimum 8 caractères"
                  required
                  disabled={resetPasswordMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords.new ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              
              {/* Barre de force */}
              {formData.newPassword && (
                <div className="mt-3">
                  <div className="flex gap-1 h-1.5">
                    <div className={`flex-1 rounded-full ${passwordStrength >= 1 ? getStrengthColor() : 'bg-gray-200'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength >= 2 ? getStrengthColor() : 'bg-gray-200'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength >= 3 ? getStrengthColor() : 'bg-gray-200'}`}></div>
                    <div className={`flex-1 rounded-full ${passwordStrength >= 4 ? getStrengthColor() : 'bg-gray-200'}`}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Utilisez au moins 8 caractères avec majuscules, minuscules et chiffres.
                  </p>
                </div>
              )}
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  placeholder="Confirmez votre mot de passe"
                  required
                  disabled={resetPasswordMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords.confirm ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white text-lg font-semibold rounded-lg hover:from-[#FF6B35]/90 hover:to-[#FF8C42]/90 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide shadow-md"
            >
              {resetPasswordMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Réinitialisation...
                </span>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>
          </form>

          {/* Lien retour */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-[#FF6B35] hover:text-[#FF6B35]/80 font-medium inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à la connexion
            </Link>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2024 Baibebalo. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordFromEmail;
