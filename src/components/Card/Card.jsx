function Card({ 
  title, 
  description, 
  children, 
  buttonText = "Acción", 
  onButtonClick, 
  className = "",
  icon,
  variant = "default" // "default", "primary", "secondary"
}) {

  // Minimalistic design variants - clean and simple
  const variants = {
    default: {
      container: `
        bg-white/[0.06] border-white/[0.12]
      `,
      iconContainer: `
        bg-white/[0.08] text-white/70
      `,
      button: `
        bg-white/[0.08] border-white/[0.15] text-white/80 hover:bg-white/[0.12] hover:text-white
      `
    },
    primary: {
      container: `
        bg-red-500/[0.08] border-red-400/[0.15]
      `,
      iconContainer: `
        bg-red-500/[0.12] text-red-300
      `,
      button: `
        bg-red-500/[0.12] border-red-400/[0.20] text-red-200 hover:bg-red-500/[0.16] hover:text-red-100
      `
    },
    secondary: {
      container: `
        bg-slate-500/[0.08] border-slate-400/[0.15]
      `,
      iconContainer: `
        bg-slate-500/[0.12] text-slate-300
      `,
      button: `
        bg-slate-500/[0.12] border-slate-400/[0.20] text-slate-200 hover:bg-slate-500/[0.16] hover:text-slate-100
      `
    }
  };

  const currentVariant = variants[variant];

  return (
    <div className="w-full h-full">
      <div 
        className={`
          relative rounded-2xl backdrop-blur-xl border h-full flex flex-col
          shadow-sm shadow-black/5
          ${currentVariant.container} ${className}
        `}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Simple header */}
          {(icon || title) && (
            <div className="flex items-center mb-4 space-x-3">
              {icon && (
                <div className={`
                  p-2 rounded-lg ${currentVariant.iconContainer}
                `}>
                  {icon}
                </div>
              )}
              {title && (
                <h3 className="text-lg font-medium text-white/90">
                  {title}
                </h3>
              )}
            </div>
          )}
          
          {/* Description */}
          {description && (
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {description}
            </p>
          )}
          
          {/* Content */}
          {children && <div className="flex-1 mb-4">{children}</div>}
          
          {/* Simple button */}
          {onButtonClick && (
            <button 
              onClick={onButtonClick}
              className={`
                w-full rounded-lg border py-3 px-4 text-sm font-medium
                transition-colors duration-200 mt-auto
                ${currentVariant.button}
              `}
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Card;