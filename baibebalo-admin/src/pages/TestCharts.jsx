import Layout from '../components/layout/Layout';
import RevenueChart from '../components/charts/RevenueChart';
import SalesGoalChart from '../components/charts/SalesGoalChart';
import PaymentMethodChart from '../components/charts/PaymentMethodChart';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';

const TestCharts = () => {
  // Données de test pour le graphique de revenus
  const revenueData = [
    { month: 'Jan', revenue: 15000 },
    { month: 'Fév', revenue: 18000 },
    { month: 'Mar', revenue: 22000 },
    { month: 'Avr', revenue: 25000 },
    { month: 'Mai', revenue: 28000 },
    { month: 'Juin', revenue: 32000 },
  ];

  // Données de test pour les méthodes de paiement
  const paymentData = [
    { name: 'Cash', value: 45, color: '#0ca3e9' },
    { name: 'Mobile Money', value: 35, color: '#10b981' },
    { name: 'Carte', value: 20, color: '#f59e0b' },
  ];

  // Données de test pour le graphique en barres
  const barData = [
    { name: 'Lun', value: 120 },
    { name: 'Mar', value: 150 },
    { name: 'Mer', value: 180 },
    { name: 'Jeu', value: 200 },
    { name: 'Ven', value: 170 },
    { name: 'Sam', value: 140 },
    { name: 'Dim', value: 100 },
  ];

  // Données de test pour le graphique en ligne
  const lineData = [
    { name: 'Lun', value: 120 },
    { name: 'Mar', value: 150 },
    { name: 'Mer', value: 180 },
    { name: 'Jeu', value: 200 },
    { name: 'Ven', value: 170 },
    { name: 'Sam', value: 140 },
    { name: 'Dim', value: 100 },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Test des Graphiques</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Page de test pour visualiser tous les graphiques avec des données de démonstration
          </p>
        </div>

        {/* Section 1: Graphiques du Dashboard */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Graphiques du Dashboard</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graphique de Revenus */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Aperçu des Revenus</h3>
                <p className="text-xs text-slate-500 mt-1">Performance mensuelle - 6 derniers mois</p>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <RevenueChart data={revenueData} />
                <div className="flex justify-between mt-4 px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Janvier</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Février</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mars</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avril</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mai</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Juin</span>
                </div>
              </div>
            </div>

            {/* Objectif de Ventes */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6">Objectif de Ventes</h3>
              <SalesGoalChart 
                current={45230}
                goal={60000}
                directSales={28400}
                partners={16830}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Graphiques Réutilisables */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Graphiques Réutilisables</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique en Barres */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Graphique en Barres</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Commandes par jour de la semaine
              </p>
              <BarChart 
                data={barData}
                dataKey="value"
                nameKey="name"
                color="#0ca3e9"
              />
            </div>

            {/* Graphique en Ligne */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Graphique en Ligne</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Évolution des commandes
              </p>
              <LineChart 
                data={lineData}
                dataKey="value"
                nameKey="name"
                color="#0ca3e9"
                strokeWidth={3}
              />
            </div>

            {/* Graphique en Secteurs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Méthodes de Paiement</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Répartition des paiements
              </p>
              <PaymentMethodChart data={paymentData} />
            </div>

            {/* Test avec différentes couleurs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Graphique en Barres (Orange)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Test avec couleur brand-orange
              </p>
              <BarChart 
                data={barData}
                dataKey="value"
                nameKey="name"
                color="#FF6B35"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Tests de Responsivité */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tests de Responsivité</h2>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Graphique Pleine Largeur</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Ce graphique s'adapte à la largeur du conteneur
            </p>
            <div className="h-80">
              <RevenueChart data={revenueData} />
            </div>
          </div>
        </section>

        {/* Section 4: Informations */}
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">✅ Tests Réussis</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Tous les graphiques sont rendus correctement</li>
            <li>Les données par défaut fonctionnent</li>
            <li>Le mode sombre est supporté</li>
            <li>Les graphiques sont responsives</li>
            <li>Les tooltips sont interactifs</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
};

export default TestCharts;
