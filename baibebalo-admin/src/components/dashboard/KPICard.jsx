import { formatPercent } from '../../utils/format';

const KPICard = ({ title, value, change, changeLabel, iconName }) => {
  const changeColor = change >= 0 
    ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
    : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
  
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <span className="material-symbols-outlined text-primary">{iconName}</span>
        </div>
        {change !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded ${changeColor}`}>
            {changeLabel || formatPercent(change)}
          </span>
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
    </div>
  );
};

export default KPICard;
