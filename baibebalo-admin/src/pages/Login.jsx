import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { testBackendConnection } from '../utils/testBackend';
import logoImage from '../assets/Baibebalo_logo_sans_fond.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Tester la connexion au backend au chargement (mode dev uniquement)
  useEffect(() => {
    if (import.meta.env.DEV) {
      testBackendConnection().then(results => {
        if (!results.backendReachable) {
          const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
          console.warn(`⚠️ Backend non accessible. Vérifiez qu'il est démarré sur http://localhost:${backendPort}`);
          toast.error(`Backend non accessible. Vérifiez qu'il est démarré sur le port ${backendPort}.`, { duration: 5000 });
        } else if (!results.apiEndpoint) {
          console.warn('⚠️ Endpoint API non accessible');
        }
      });
    }
  }, []);
  
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authAPI.login(email, password),
    onSuccess: (data) => {
      const { accessToken, refreshToken, admin } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('admin', JSON.stringify(admin));
      toast.success('Connexion réussie');
      navigate('/');
    },
    onError: (error) => {
      console.error('❌ Erreur login:', error);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.error?.details
        || error.message
        || 'Erreur de connexion';
      toast.error(errorMessage);
      
      // En mode dev, afficher plus de détails
      if (import.meta.env.DEV) {
        console.error('📊 Détails erreur login:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
        });
      }
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
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
          {/* Logo texte en haut */}
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-black">Bai</span>
              <span className="text-[#FF6B35]">bebalo</span>
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Connexion Administrateur</h2>
          <p className="text-sm text-gray-600 text-center mb-8">Veuillez entrer vos identifiants pour continuer</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Messagerie électronique
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
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  placeholder="..........."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>
              <a
                href="/forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
                className="text-sm text-[#FF6B35] hover:text-[#FF6B35]/80 font-medium underline"
              >
                Réinitialiser mot de passe
              </a>
            </div>
            
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white text-lg font-semibold rounded-lg hover:from-[#FF6B35]/90 hover:to-[#FF8C42]/90 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide shadow-md"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion...
                </span>
              ) : (
                'SE CONNECTER'
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2024 Baibebalo. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default Login;
