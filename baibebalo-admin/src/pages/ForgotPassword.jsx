import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';
import logoImage from '../assets/Baibebalo_logo_sans_fond.png';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  // Demande de réinitialisation de mot de passe
  const requestResetMutation = useMutation({
    mutationFn: (email) => authAPI.forgotPassword(email),
    onSuccess: () => {
      toast.success('Si cet email existe, vous recevrez un lien de réinitialisation par email.');
      setEmail('');
      // Optionnel: rediriger vers login après quelques secondes
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }

    requestResetMutation.mutate(email);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 relative">
      {/* Dark mode toggle - top right */}
      <button className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <div className="max-w-md w-full">
        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Réinitialiser le mot de passe</h2>
          
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-block">
              <span className="text-5xl md:text-6xl lg:text-7xl font-bold">
                <span className="text-[#FF6B35]">Ba</span>
                <span className="text-black">ibebalo</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 text-center mb-8">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  placeholder="admin@baibebalo.ci"
                  disabled={requestResetMutation.isPending}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={requestResetMutation.isPending}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white text-lg font-semibold rounded-lg hover:from-[#FF6B35]/90 hover:to-[#FF8C42]/90 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide shadow-md"
            >
              {requestResetMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Envoi en cours...
                </span>
              ) : (
                'ENVOYER LE LIEN DE RÉINITIALISATION'
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

export default ForgotPassword;
