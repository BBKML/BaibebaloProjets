import { formatPercent } from '../../utils/format';

/**
 * KPICard — Carte indicateur clé de performance
 * Props:
 *   title        — Libellé principal (ex: "CA Total")
 *   value        — Valeur principale formatée (ex: "1 250 000 FCFA")
 *   change       — Évolution en % (number, positif = hausse)
 *   changeLabel  — Texte alternatif de l'évolution (ex: "+12 nouveaux")
 *   iconName     — Nom icône Material Symbols
 *   color        — Thème de couleur: 'blue' | 'green' | 'orange' | 'purple' | 'red'
 *   subtitle     — Ligne secondaire (ex: "Dont 12 500 FCFA aujourd'hui")
 *   href         — Si fourni, la carte est cliquable
 */
const THEMES = {
  blue:   { bg: 'bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-500/10',   text: 'text-blue-500',   ring: 'ring-blue-500/20' },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500/20' },
  purple: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-500', ring: 'ring-violet-500/20' },
  red:    { bg: 'bg-rose-500',   light: 'bg-rose-50 dark:bg-rose-500/10',   text: 'text-rose-500',   ring: 'ring-rose-500/20' },
  primary:{ bg: 'bg-primary',    light: 'bg-primary/10',                     text: 'text-primary',    ring: 'ring-primary/20' },
};

const KPICard = ({
  title,
  value,
  change,
  changeLabel,
  iconName,
  color = 'primary',
  subtitle,
  href,
}) => {
  const theme = THEMES[color] || THEMES.primary;
  const isPositive = change === undefined ? null : change >= 0;
  const changeColor = isPositive === null
    ? ''
    : isPositive
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10';

  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper
      href={href}
      className={`
        group relative bg-white dark:bg-slate-900 rounded-2xl p-5
        border border-slate-200 dark:border-slate-800
        shadow-sm hover:shadow-md transition-all duration-200
        ${href ? 'cursor-pointer hover:-translate-y-0.5' : ''}
      `}
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bg} rounded-t-2xl`} />

      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl ${theme.light} ring-1 ${theme.ring}`}>
          <span
            className={`material-symbols-outlined ${theme.text}`}
            style={{ fontSize: '22px' }}
          >
            {iconName}
          </span>
        </div>

        {/* Badge d'évolution */}
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${changeColor}`}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px' }}
            >
              {isPositive ? 'trending_up' : 'trending_down'}
            </span>
            {changeLabel || formatPercent(change)}
          </span>
        )}
      </div>

      {/* Valeur */}
      <div>
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{subtitle}</p>
        )}
      </div>

      {/* Flèche de navigation si cliquable */}
      {href && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px' }}>
            arrow_forward
          </span>
        </div>
      )}
    </Wrapper>
  );
};

export default KPICard;
