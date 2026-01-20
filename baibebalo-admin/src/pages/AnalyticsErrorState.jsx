import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const AnalyticsErrorState = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    // Réessayer de charger les données
    globalThis.location.reload();
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="max-w-xl w-full text-center px-4 py-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
          {/* Error Illustration */}
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Abstract Disconnected Icon Pattern */}
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700/50 rounded-full animate-pulse opacity-50" />
              <div className="relative flex items-center justify-center text-slate-300 dark:text-slate-600">
                <span className="material-symbols-outlined text-[120px]">error_outline</span>
              </div>
              {/* Crossed Lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-0.5 bg-red-500 rotate-45" />
                <div className="w-32 h-0.5 bg-red-500 -rotate-45" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Erreur de Chargement
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Impossible de charger les données analytics. Veuillez vérifier votre connexion et réessayer.
              </p>
            </div>

            {/* Error Details */}
            <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl">info</span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Détails de l'erreur :</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>Connexion au serveur interrompue</li>
                    <li>Timeout de la requête API</li>
                    <li>Vérifiez que le backend est démarré</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Réessayer
              </button>
              <button
                onClick={handleGoBack}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-lg border border-slate-200 dark:border-slate-600 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Retour au Dashboard
              </button>
            </div>

            {/* Support Link */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 w-full">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Besoin d'aide ?{' '}
                <button className="text-primary hover:underline font-semibold">Contacter le support</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsErrorState;
