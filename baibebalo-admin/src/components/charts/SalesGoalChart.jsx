const SalesGoalChart = ({ current = 45000, goal = 60000, directSales = 28400, partners = 16830 }) => {
  const percentage = Math.min((current / goal) * 100, 100);
  const directPercentage = (directSales / goal) * 100;
  const partnersPercentage = (partners / goal) * 100;

  // Calcul pour le cercle SVG
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Cercle de progression */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full transform -rotate-90">
          {/* Cercle de fond */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Cercle de progression */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        {/* Texte au centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(percentage)}%</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Complété</span>
        </div>
      </div>

      {/* Objectif */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Objectif du mois</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {goal.toLocaleString('fr-FR')} FCFA
        </p>
      </div>

      {/* Barres de progression */}
      <div className="w-full pt-4 space-y-3">
        {/* Ventes directes */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-500 font-medium">Ventes directes</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {directSales.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(directPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Partenaires */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-500 font-medium">Partenaires</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {partners.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-orange h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(partnersPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesGoalChart;
