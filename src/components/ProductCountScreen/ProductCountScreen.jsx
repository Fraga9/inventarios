import { useState } from 'react';

function ProductCountScreen({ product, onSaveCount, onBack }) {
  const [count, setCount] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    setCount(prev => prev > 0 ? prev - 1 : 0);
  };

  const handleSave = () => {
    if (onSaveCount) {
      onSaveCount(product?.barcode, count);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <div 
        className={`
          relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-xl border border-white/10 
          bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02]
          transition-all duration-500 ease-out shadow-xl shadow-black/10
          ${isHovered ? 'transform scale-[1.01] shadow-2xl shadow-white/5' : ''}
          before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl 
          before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent 
          before:opacity-0 before:transition-opacity before:duration-300
          ${isHovered ? 'before:opacity-100' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative z-10 p-6 sm:p-10"> {/* Más padding */}
          {/* Header mejorado responsivo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6 sm:mb-8 space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-red-500/20 border border-red-400/30 backdrop-blur-sm transition-all duration-300">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M12 9v6m-3.75-6h7.5m0 0V5.25A2.25 2.25 0 0018 3h-1.5C15.12 3 14.25 3.84 14.25 5.25v.75m0 0H9.75v-.75A2.25 2.25 0 008.25 3H6.75A2.25 2.25 0 004.5 5.25v.75m0 0h15M9 21h6" />
              </svg>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-medium text-white/95 tracking-wide mb-1">
                Contar Producto
              </h3>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                Verificación y registro preciso de inventario
              </p>
            </div>
          </div>

          {/* Información del producto mejorada para móviles */}
          {product && (
            <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/15 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
                {product.image && (
                  <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-semibold text-white/95 text-lg sm:text-xl mb-3 leading-tight">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-white/60 text-sm mb-3 font-light">
                      {product.category}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3">
                    <span className="px-3 py-2 bg-gray-500/20 border border-gray-400/30 rounded-xl text-sm font-medium text-gray-300 tracking-wide">
                      {product.barcode}
                    </span>
                    {product.price && (
                      <span className="px-3 py-2 bg-red-500/20 border border-red-400/30 rounded-xl text-sm font-medium text-red-300 tracking-wide">
                        {product.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección del contador mejorada para móviles */}
          <div className="mb-8 sm:mb-10">
            {/* Display principal del contador */}
            <div className="text-center mb-8 sm:mb-10">
              <div className="relative inline-block">
                <div className={`
                  text-6xl sm:text-7xl font-light text-white/95 mb-4 transition-all duration-500
                  ${isInputFocused ? 'text-red-400 scale-105' : ''}
                `}>
                  {count}
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 sm:w-16 h-1 bg-gradient-to-r from-transparent via-red-400/50 to-transparent rounded-full"></div>
              </div>
              <p className="text-white/60 text-sm sm:text-base font-light tracking-wide">
                {count === 1 ? 'unidad contada' : 'unidades contadas'}
              </p>
            </div>

            {/* Controles del contador optimizados para móviles */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-8 mb-6 sm:mb-8">
              {/* Botón decrementar */}
              <button
                onClick={handleDecrement}
                disabled={count <= 0}
                className={`
                  group relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border backdrop-blur-sm transition-all duration-300 ease-out
                  ${count <= 0 
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed scale-95' 
                    : 'bg-white/10 border-white/20 hover:bg-red-500/20 hover:border-red-400/30 text-white/80 hover:text-red-300 active:scale-95 hover:shadow-lg hover:shadow-red-500/10'
                  }
                  before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl before:bg-gradient-to-br 
                  before:from-red-500/10 before:to-transparent before:opacity-0 
                  before:transition-opacity before:duration-300
                  ${count > 0 ? 'hover:before:opacity-100' : ''}
                `}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>

              {/* Input de número responsivo */}
              <div className="relative">
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  className={`
                    w-20 sm:w-28 text-center text-xl sm:text-2xl font-medium backdrop-blur-sm 
                    border rounded-xl sm:rounded-2xl py-3 sm:py-4 px-2 sm:px-4 text-white/95 
                    transition-all duration-300 focus:outline-none
                    ${isInputFocused 
                      ? 'bg-red-500/20 border-red-400/40 shadow-lg shadow-red-500/10 scale-105' 
                      : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                    }
                  `}
                  min="0"
                />
                <div className={`
                  absolute inset-0 rounded-xl sm:rounded-2xl transition-all duration-300 pointer-events-none
                  ${isInputFocused ? 'ring-2 ring-red-400/50 ring-offset-2 ring-offset-transparent' : ''}
                `}></div>
              </div>

              {/* Botón incrementar */}
              <button
                onClick={handleIncrement}
                className="group relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-red-500/20 hover:border-red-400/30 text-white/80 hover:text-red-300 transition-all duration-300 ease-out active:scale-95 hover:shadow-lg hover:shadow-red-500/10 before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl before:bg-gradient-to-br before:from-red-500/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
              </button>
            </div>

            {/* Incrementos rápidos responsive */}
            <div className="flex justify-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
              {[5, 10, 25, 50].map((increment) => (
                <button
                  key={increment}
                  onClick={() => setCount(prev => prev + increment)}
                  className="group px-3 py-2 sm:px-4 sm:py-2 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-xs sm:text-sm font-medium hover:scale-105"
                >
                  +{increment}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción responsive */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={onBack}
              className="group relative flex-1 overflow-hidden rounded-xl sm:rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all duration-300 ease-out font-medium text-sm sm:text-base py-4 sm:py-5 px-6 sm:px-8 active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:via-white/5 before:to-transparent before:translate-x-[-100%] before:transition-transform before:duration-500 hover:before:translate-x-[100%]"
            >
              <div className="relative z-10 flex items-center justify-center space-x-2 sm:space-x-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Regresar</span>
              </div>
            </button>
            
            <button 
              onClick={handleSave}
              className="group relative flex-1 overflow-hidden rounded-xl sm:rounded-2xl border border-red-400/30 bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 hover:border-red-400/50 text-red-100 hover:text-white transition-all duration-300 ease-out font-medium text-sm sm:text-base py-4 sm:py-5 px-6 sm:px-8 active:scale-[0.98] hover:shadow-lg hover:shadow-red-500/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-400/20 before:via-red-400/10 before:to-transparent before:translate-x-[-100%] before:transition-transform before:duration-500 hover:before:translate-x-[100%]"
            >
              <div className="relative z-10 flex items-center justify-center space-x-2 sm:space-x-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Guardar Conteo</span>
              </div>
            </button>
          </div>
        </div>

        {/* Efectos de fondo mejorados */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-red-500/8 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-radial from-gray-500/10 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-white/[0.02] to-transparent rounded-full pointer-events-none"></div>
        
        {/* Efecto de partículas sutiles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-400/30 rounded-full animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-gray-400/20 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        </div>
      </div>
    </div>
  );
}

export default ProductCountScreen;