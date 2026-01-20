import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import FinancialReportWizard from '../components/modals/FinancialReportWizard';

const FinancialReports = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'commission']);
  const [aggregation, setAggregation] = useState('daily');
  const [distribution, setDistribution] = useState('email');

  const steps = [
    { number: 1, label: 'Métriques', key: 'metrics' },
    { number: 2, label: 'Agrégation', key: 'aggregation' },
    { number: 3, label: 'Distribution', key: 'distribution' },
  ];

  const metrics = [
    {
      id: 'revenue',
      name: 'Chiffre d\'affaires',
      description: 'Total brut généré par les ventes avant commissions.',
      icon: 'trending_up',
      color: 'green',
    },
    {
      id: 'commission',
      name: 'Commissions',
      description: 'Frais de service prélevés sur chaque transaction.',
      icon: 'percent',
      color: 'blue',
    },
    {
      id: 'payout',
      name: 'Versements',
      description: 'Montant net versé aux vendeurs (Payouts).',
      icon: 'payments',
      color: 'orange',
    },
  ];

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = () => {
    toast.success('Rapport financier généré avec succès !');
  };

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    };
    return colors[color] || colors.blue;
  };

  const progress = (currentStep / 3) * 100;

  return (
    <Layout>
      <div className="flex flex-col items-center py-12 px-8">
        <div className="max-w-4xl w-full">
          {/* Headline */}
          <header className="mb-10 text-center">
            <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">
              Génération de Rapports Financiers
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Configurez votre rapport personnalisé en 3 étapes simples.
            </p>
          </header>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-12 px-10 relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            {steps.map((step) => (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                    currentStep >= step.number
                      ? 'bg-primary text-white shadow-primary/20'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`mt-2 text-sm font-semibold ${
                    currentStep >= step.number ? 'text-primary' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Wizard Card Container */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Progress Header */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Étape {currentStep} : {steps[currentStep - 1].label}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-200/50 dark:bg-slate-700 px-2 py-1 rounded">
                  {Math.round(progress)}% Complété
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                {currentStep === 1 &&
                  'Choisissez les données financières que vous souhaitez inclure dans le calcul du rapport final.'}
                {currentStep === 2 && 'Sélectionnez la méthode d\'agrégation des données.'}
                {currentStep === 3 && 'Choisissez comment vous souhaitez recevoir le rapport.'}
              </p>
            </div>

            {/* Step Content */}
            <div className="p-8 space-y-6">
              {currentStep === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {metrics.map((metric) => {
                      const isSelected = selectedMetrics.includes(metric.id);
                      return (
                        <label key={metric.id} className="relative cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMetricToggle(metric.id)}
                            className="sr-only peer"
                          />
                          <div
                            className={`h-full p-5 border-2 rounded-xl transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div
                              className={`size-10 rounded-lg ${getColorClasses(metric.color)} flex items-center justify-center mb-4`}
                            >
                              <span className="material-symbols-outlined">{metric.icon}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{metric.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {metric.description}
                            </p>
                            {isSelected && (
                              <div className="absolute top-4 right-4 text-primary">
                                <span className="material-symbols-outlined text-xl">check_circle</span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Additional Filters */}
                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Filtres avancés</h3>
                      <button className="text-xs font-semibold text-primary hover:underline">
                        Effacer les filtres
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Catégorie de Produits
                        </label>
                        <select className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          <option>Toutes les catégories</option>
                          <option>Électronique</option>
                          <option>Mode & Accessoires</option>
                          <option>Maison & Jardin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Statut des Transactions
                        </label>
                        <select className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          <option>Toutes (Complétées, Remboursées...)</option>
                          <option>Complétées uniquement</option>
                          <option>En attente</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                    Méthode d'agrégation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((agg) => (
                      <label key={agg} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="aggregation"
                          value={agg}
                          checked={aggregation === agg}
                          onChange={(e) => setAggregation(e.target.value)}
                          className="sr-only peer"
                        />
                        <div
                          className={`p-4 border-2 rounded-xl transition-all ${
                            aggregation === agg
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                            {agg === 'daily' ? 'Quotidien' : agg === 'weekly' ? 'Hebdomadaire' : agg === 'monthly' ? 'Mensuel' : 'Annuel'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                    Méthode de distribution
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['email', 'download'].map((dist) => (
                      <label key={dist} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="distribution"
                          value={dist}
                          checked={distribution === dist}
                          onChange={(e) => setDistribution(e.target.value)}
                          className="sr-only peer"
                        />
                        <div
                          className={`p-4 border-2 rounded-xl transition-all ${
                            distribution === dist
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {dist === 'email' ? '📧 Envoyer par email' : '⬇️ Télécharger immédiatement'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentStep === 1
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Précédent
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                {currentStep === 3 ? (
                  <>
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    Générer le rapport
                  </>
                ) : (
                  <>
                    Suivant
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancialReports;
