import { useState } from "react";

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
  const [isHovered, setIsHovered] = useState(false);

  // Variantes de diseño basadas en el JSON
  const variants = {
    default: {
      container: `
        bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02]
        border-white/10
      `,
      iconContainer: `
        bg-white/10 border-white/20
      `,
      button: `
        border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30 
        text-white/90 hover:text-white
      `
    },
    primary: {
      container: `
        bg-gradient-to-br from-red-500/[0.15] via-red-500/[0.08] to-red-500/[0.04]
        border-red-400/20
      `,
      iconContainer: `
        bg-red-500/20 border-red-400/30
      `,
      button: `
        border-red-400/30 bg-red-500/20 hover:bg-red-500/30 hover:border-red-400/50 
        text-red-100 hover:text-white
      `
    },
    secondary: {
      container: `
        bg-gradient-to-br from-gray-500/[0.12] via-gray-500/[0.06] to-gray-500/[0.03]
        border-gray-400/20
      `,
      iconContainer: `
        bg-gray-500/20 border-gray-400/30
      `,
      button: `
        border-gray-400/30 bg-gray-500/20 hover:bg-gray-500/30 hover:border-gray-400/50 
        text-gray-100 hover:text-white
      `
    }
  };

  const currentVariant = variants[variant];

  return (
    <div className="w-full h-full"> {/* Contenedor para asegurar espacio completo */}
      <div 
        className={`
          relative overflow-hidden rounded-3xl backdrop-blur-xl border
          transition-all duration-500 ease-out h-full flex flex-col
          shadow-lg shadow-black/15
          ${currentVariant.container}
          ${isHovered ? 'transform scale-[1.02] shadow-2xl shadow-black/20' : ''}
          before:absolute before:inset-0 before:rounded-3xl 
          before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent 
          before:opacity-0 before:transition-opacity before:duration-300
          ${isHovered ? 'before:opacity-100' : ''}
          ${className}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative z-10 p-8 flex flex-col h-full">
          {/* Header con ícono y título - Espaciado mejorado */}
          {(icon || title) && (
            <div className="flex items-center mb-6 space-x-4">
              {icon && (
                <div className={`
                  p-3 rounded-2xl transition-all duration-300 ease-out
                  border backdrop-blur-sm
                  ${currentVariant.iconContainer}
                `}>
                  <div className="w-7 h-7 flex items-center justify-center">
                    {icon}
                  </div>
                </div>
              )}
              {title && (
                <div>
                  <h3 className="text-xl font-medium text-white/95 tracking-wide">
                    {title}
                  </h3>
                  {/* Subtítulo opcional basado en el patrón del JSON */}
                  <p className="text-sm text-white/60 mt-1 font-light">
                    Gestión inteligente
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Descripción con mejor tipografía */}
          {description && (
            <p className="text-white/75 text-sm leading-relaxed mb-6 font-light">
              {description}
            </p>
          )}
          
          {/* Contenido dinámico - flex-1 para ocupar espacio disponible */}
          {children && <div className="flex-1 mb-6">{children}</div>}
          
          {/* Botón mejorado siguiendo el patrón del JSON */}
          {onButtonClick && (
            <button 
              onClick={onButtonClick}
              className={`
                group relative w-full overflow-hidden rounded-2xl border backdrop-blur-sm 
                transition-all duration-300 ease-out font-medium text-sm py-4 px-6
                active:scale-[0.98] mt-auto
                ${currentVariant.button}
                before:absolute before:inset-0 before:bg-gradient-to-r 
                before:from-white/10 before:via-white/5 before:to-transparent 
                before:translate-x-[-100%] before:transition-transform before:duration-500
                hover:before:translate-x-[100%]
              `}
            >
              <div className="relative z-10 flex items-center justify-center space-x-2">
                {/* Icono dinámico basado en la variante */}
                <svg 
                  className="w-5 h-5 transition-transform group-hover:scale-110" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5}
                >
                  {variant === 'primary' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  )}
                </svg>
                <span>{buttonText}</span>
              </div>
            </button>
          )}
        </div>

        {/* Efectos de fondo mejorados siguiendo el JSON */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-white/5 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className={`
          absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial to-transparent rounded-full 
          translate-y-12 -translate-x-12
          ${variant === 'primary' ? 'from-red-500/10' : 'from-gray-500/8'}
        `}></div>
        
        {/* Efecto de brillo sutil */}
        <div className={`
          absolute inset-0 opacity-0 transition-opacity duration-300
          bg-gradient-to-br from-transparent via-white/[0.02] to-transparent
          ${isHovered ? 'opacity-100' : ''}
        `}></div>
      </div>
    </div>
  );
}

export default Card;