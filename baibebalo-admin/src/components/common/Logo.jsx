/**
 * Composant Logo Baibebalo
 * 
 * Utilisation:
 * <Logo size="default" showText={true} variant="icon" />
 * 
 * Props:
 * - size: 'small' | 'default' | 'large' (défaut: 'default')
 * - showText: boolean - Afficher le texte "Admin Control" (défaut: false)
 * - className: string - Classes CSS supplémentaires
 * - variant: 'icon' | 'logo' | 'text' (défaut: 'icon')
 *   - 'icon': Utilise l'icône seule
 *   - 'logo': Utilise le logo complet
 *   - 'text': Utilise le texte stylisé
 */

import logoIcon from '../../assets/Baibebalo_icon_sans_fond_orange.png';
import logoFull from '../../assets/Baibebalo_logo_sans_fond.png';

const Logo = ({ 
  size = 'default', 
  showText = false, 
  className = '',
  variant = 'icon'
}) => {
  // Tailles prédéfinies
  const sizeClasses = {
    small: 'h-8',
    default: 'h-10',
    large: 'h-16',
  };

  // Utiliser l'image logo
  if (variant === 'icon' || variant === 'logo') {
    const logoSource = variant === 'icon' ? logoIcon : logoFull;
    
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src={logoSource} 
          alt="Baibebalo" 
          className={`${sizeClasses[size]} w-auto`}
        />
        {showText && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Admin Control
          </p>
        )}
      </div>
    );
  }

  // Logo texte avec les bonnes couleurs (fallback)
  return (
    <div className={`flex flex-col ${className}`}>
      <h1 className={`${sizeClasses[size]} font-bold tracking-tight leading-none uppercase`}>
        <span className="text-[#FF6B35]">Ba</span>
        <span className="text-black dark:text-white relative inline-block">
          i
          <span className="absolute -top-0.5 left-[0.4em] text-[0.5em] leading-none">★</span>
        </span>
        <span className="text-black dark:text-white">bebalo</span>
      </h1>
      {showText && (
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mt-0.5">
          Admin Control
        </p>
      )}
    </div>
  );
};

export default Logo;
