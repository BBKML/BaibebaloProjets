import { useState } from 'react';
import toast from 'react-hot-toast';

const FinancialReportWizard = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedKPIs, setSelectedKPIs] = useState(['revenue', 'ebitda']);
  const [includeProjections, setIncludeProjections] = useState(true);
  const [aggregationMethod, setAggregationMethod] = useState('monthly');
  const [distributionMethod, setDistributionMethod] = useState('email');

  if (!isOpen) return null;

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const kpiOptions = [
    {
      id: 'revenue',
      label: 'Chiffre d\'affaires',
      description: 'Total des ventes brutes sur la période sélectionnée.',
      icon: 'trending_up',
    },
    {
      id: 'grossMargin',
      label: 'Marge Brute',
      description: 'Rentabilité directe après déduction des coûts variables.',
      icon: 'payments',
    },
    {
      id: 'cashflow',
      label: 'Flux de trésorerie (Cashflow)',
      description: 'Mouvements de liquidités entrants et sortants.',
      icon: 'account_balance_wallet',
    },
    {
      id: 'ebitda',
      label: 'EBITDA',
      description: 'Bénéfice avant intérêts, impôts et amortissements.',
      icon: 'pie_chart',
    },
  ];

  const handleToggleKPI = (kpiId) => {
    setSelectedKPIs((prev) =>
      prev.includes(kpiId) ? prev.filter((id) => id !== kpiId) : [...prev, kpiId]
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = () => {
    toast.success('Génération du rapport financier en cours...');
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                Sélectionnez les indicateurs (KPIs)
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Choisissez les données financières qui seront agrégées dans votre rapport final. Vous pouvez en
                sélectionner plusieurs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kpiOptions.map((kpi) => {
                const isSelected = selectedKPIs.includes(kpi.id);
                return (
                  <div
                    key={kpi.id}
                    onClick={() => handleToggleKPI(kpi.id)}
                    className={`relative group cursor-pointer border-2 rounded-xl p-5 flex items-start gap-4 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'
                    }`}
                  >
                    <div className="mt-1">
                      <div
                        className={`size-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">{kpi.label}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpi.description}</p>
                    </div>
                    <div
                      className={`absolute right-4 top-4 ${
                        isSelected ? 'text-primary/20 group-hover:text-primary/40' : 'text-slate-100 dark:text-slate-800 group-hover:text-primary/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl">{kpi.icon}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <span className="material-symbols-outlined text-orange-500">warning</span>
              <div>
                <p className="text-sm font-bold text-orange-500">Données de latence</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  L'indicateur EBITDA peut présenter un délai de 24h sur les filiales internationales.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  Inclure les projections prévisionnelles (Budget v Actual)
                </span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={includeProjections}
                    onChange={(e) => setIncludeProjections(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary" />
                </div>
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                Consolidation des données
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Choisissez la méthode d'agrégation et la granularité temporelle pour votre rapport.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Méthode d'agrégation</h4>
                <div className="grid grid-cols-2 gap-4">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setAggregationMethod(method)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        aggregationMethod === method
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {method === 'daily' && 'Quotidien'}
                        {method === 'weekly' && 'Hebdomadaire'}
                        {method === 'monthly' && 'Mensuel'}
                        {method === 'yearly' && 'Annuel'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                Diffusion du rapport
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Choisissez comment vous souhaitez recevoir le rapport généré.
              </p>
            </div>

            <div className="space-y-4">
              {['email', 'download', 'both'].map((method) => (
                <button
                  key={method}
                  onClick={() => setDistributionMethod(method)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    distributionMethod === method
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">
                      {method === 'email' && 'email'}
                      {method === 'download' && 'download'}
                      {method === 'both' && 'send'}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {method === 'email' && 'Envoi par email'}
                        {method === 'download' && 'Téléchargement direct'}
                        {method === 'both' && 'Email + Téléchargement'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {method === 'email' && 'Le rapport sera envoyé à votre adresse email'}
                        {method === 'download' && 'Téléchargez le rapport immédiatement'}
                        {method === 'both' && 'Recevez par email et téléchargez'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepLabel = (step) => {
    switch (step) {
      case 1:
        return 'Indicateurs (KPIs)';
      case 2:
        return 'Consolidation';
      case 3:
        return 'Diffusion';
      default:
        return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14, 21, 27, 0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Génération de Rapport</h2>
              <p className="text-xs text-slate-500 font-medium">Phase 4 - Gestion Financière</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-col gap-4">
            <div className="flex gap-6 justify-between items-center mb-2">
              <p className="text-slate-900 dark:text-white text-sm font-bold leading-normal uppercase tracking-widest">
                Étape {currentStep} sur {totalSteps}
              </p>
              <p className="text-primary text-sm font-bold leading-normal">{Math.round(progress)}% Complété</p>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center font-bold shadow-lg ${
                      step <= currentStep
                        ? 'bg-primary text-white shadow-primary/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {step}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      step <= currentStep ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {getStepLabel(step)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8">{renderStepContent()}</div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky bottom-0 z-10">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Précédent
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 flex items-center gap-2 transition-transform active:scale-95"
          >
            {currentStep === totalSteps ? (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Générer le rapport
              </>
            ) : (
              <>
                Suivant
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportWizard;
