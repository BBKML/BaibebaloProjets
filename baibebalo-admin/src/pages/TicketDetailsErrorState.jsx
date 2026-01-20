import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const TicketDetailsErrorState = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleRetry = () => {
    // Réessayer de charger les données
    globalThis.location.reload();
  };

  const handleGoBack = () => {
    navigate('/support');
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Back Button */}
        <div className="w-full max-w-2xl mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-all group"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span className="text-sm font-semibold">Retour au support</span>
          </button>
        </div>

        {/* Error Card */}
        <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-12 flex flex-col items-center text-center">
            {/* Illustration Container */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg
                  className="text-slate-300 dark:text-slate-600"
                  fill="none"
                  height="180"
                  viewBox="0 0 24 24"
                  width="180"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                  <path
                    className="animate-pulse"
                    d="M15 8L9 12M9 8L15 12"
                    stroke="#FF6B35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                {/* Broken Effect Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-primary text-6xl opacity-20">error</span>
                </div>
              </div>
            </div>

            {/* Error Text */}
            <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Impossible de charger la conversation
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Une erreur technique est survenue lors de la récupération des messages. Veuillez vérifier votre
                connexion réseau ou réessayer ultérieurement.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Réessayer
              </button>
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-lg border border-slate-200 dark:border-slate-600 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Retour à la liste
              </button>
            </div>

            {/* Error Details */}
            <div className="mt-8 w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl">info</span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Détails techniques :</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>Ticket ID: #{id || 'N/A'}</li>
                    <li>Erreur HTTP 500 - Serveur interne</li>
                    <li>Timestamp: {new Date().toLocaleString('fr-FR')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Support Link */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 w-full">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Le problème persiste ?{' '}
                <button className="text-primary hover:underline font-semibold">Contacter le support technique</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TicketDetailsErrorState;
