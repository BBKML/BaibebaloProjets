import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';
import { testBackendConnection } from '../utils/testBackend';
import logoIcon from '../assets/Baibebalo_icon_sans_fond_orange.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      testBackendConnection().then(results => {
        if (!results.backendReachable) {
          const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
          toast.error(`Backend inaccessible — port ${backendPort}`, { duration: 5000 });
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
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.error?.details ||
        error.message ||
        'Identifiants incorrects';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1528] flex-col justify-between p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src={logoIcon} alt="Baibebalo" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wide leading-none">BAIBEBALO</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Message central */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Gérez votre plateforme<br />
              <span className="text-primary">en temps réel.</span>
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Commandes, restaurants, livreurs, finances — tout est centralisé dans un seul tableau de bord.
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: 'shopping_cart', label: 'Commandes suivies', value: 'En temps réel' },
              { icon: 'delivery_dining', label: 'Livreurs actifs', value: 'Géolocalisation live' },
              { icon: 'payments', label: 'Finances FCFA', value: 'Rapports automatiques' },
              { icon: 'analytics', label: 'Analyses avancées', value: 'Cohortes & tendances' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '20px' }}>{icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs relative z-10">
          © {new Date().getFullYear()} Baibebalo — Tous droits réservés
        </p>
      </div>

      {/* ── Panneau droit — Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50 dark:bg-slate-950">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src={logoIcon} alt="Baibebalo" className="h-9 w-auto" />
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase">BAIBEBALO</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Entête formulaire */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Connexion</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Accès réservé aux administrateurs Baibebalo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                  placeholder="admin@baibebalo.ci"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Se souvenir */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="remember-me" className="text-sm text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                Rester connecté
              </label>
            </div>

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md shadow-primary/20 text-sm uppercase tracking-wider"
            >
              {loginMutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion en cours...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Info sécurité */}
          <div className="mt-8 flex items-center gap-2.5 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-slate-400 shrink-0" style={{ fontSize: '18px' }}>shield</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connexion sécurisée — vos données sont chiffrées et protégées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
