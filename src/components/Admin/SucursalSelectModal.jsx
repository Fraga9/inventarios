import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';

function SucursalSelectModal({ isOpen, onClose, onSelect, allowClose = true }) {
  const [sucursales, setSucursales] = useState([]);
  const [filteredSucursales, setFilteredSucursales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSucursales();
      // Bloquear scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll del body cuando el modal se cierre
      document.body.style.overflow = 'unset';
    }

    // Cleanup function para restaurar scroll al desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    // Filtrar sucursales basado en el término de búsqueda
    const filtered = sucursales.filter(sucursal =>
      sucursal.Sucursal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sucursal.Región?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sucursal.Dirección?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSucursales(filtered);
  }, [searchTerm, sucursales]);

  const loadSucursales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sucursalesData = await AuthService.getSucursales();
      setSucursales(sucursalesData || []);
      setFilteredSucursales(sucursalesData || []);
      
    } catch (error) {
      console.error('Error loading sucursales:', error);
      setError(`Error al cargar sucursales: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSucursal = (sucursal) => {
    onSelect(sucursal);
    setSearchTerm('');
  };

  const handleClose = () => {
    if (allowClose) {
      onClose();
      setSearchTerm('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-gray-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[85vh] mx-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">
              Seleccionar Sucursal
            </h3>
            <p className="text-white/60 text-sm">
              Elige la sucursal que deseas administrar
            </p>
          </div>
          {allowClose && (
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300 hover:text-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Box */}
        <div className="p-6 border-b border-white/10">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, región o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
                  <div className="w-8 h-8 border-3 border-transparent border-t-blue-400 rounded-full"></div>
                </div>
                <p className="text-white/60">Cargando sucursales...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-red-200 mb-2">Error al cargar sucursales</p>
                <p className="text-white/60 text-sm">{error}</p>
                <button
                  onClick={loadSucursales}
                  className="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-blue-200 hover:text-blue-100 font-medium transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : filteredSucursales.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-white/60">
                  {searchTerm ? 'No se encontraron sucursales que coincidan' : 'No hay sucursales disponibles'}
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="flex-1 overflow-y-auto"
              style={{ maxHeight: 'calc(85vh - 200px)' }}
              onWheel={(e) => {
                e.stopPropagation();
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                const isScrollingUp = e.deltaY < 0;
                const isScrollingDown = e.deltaY > 0;
                const isAtTop = scrollTop === 0;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight;
                
                // Solo prevenir la propagación si no estamos en los bordes del scroll
                if ((isScrollingUp && !isAtTop) || (isScrollingDown && !isAtBottom)) {
                  e.preventDefault();
                }
              }}
            >
              <div className="p-6">
                <div className="grid gap-3">
                  {filteredSucursales.map((sucursal) => (
                    <button
                      key={sucursal.id_sucursal}
                      onClick={() => handleSelectSucursal(sucursal)}
                      className="group p-4 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-blue-400/30 rounded-xl text-left transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-lg mb-1 group-hover:text-blue-200 transition-colors">
                            {sucursal.Sucursal}
                          </h4>
                          
                          <div className="space-y-1">
                            {sucursal.Región && (
                              <p className="text-white/60 text-sm flex items-center">
                                <svg className="w-4 h-4 mr-2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                {sucursal.Región}
                              </p>
                            )}
                            
                            {sucursal.Dirección && (
                              <p className="text-white/50 text-sm flex items-start">
                                <svg className="w-4 h-4 mr-2 mt-0.5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                </svg>
                                {sucursal.Dirección}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <svg className="w-6 h-6 text-white/40 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!allowClose && (
          <div className="p-4 border-t border-white/10">
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-yellow-200 text-sm font-medium">
                  Debes seleccionar una sucursal para continuar
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SucursalSelectModal;