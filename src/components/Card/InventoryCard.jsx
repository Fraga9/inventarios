import { useState, useEffect } from 'react';
import { InventoryService } from '../../services/inventoryService';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

function InventoryCard() {
  const { profile, isAdmin } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'quantity', 'lastCounted'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'low', 'recent'

  useEffect(() => {
    if (profile) {
      loadInventoryData();
    }
  }, [profile]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Skip loading if user doesn't have sucursal or is admin without specific sucursal
      if (!profile?.id_sucursal && !isAdmin) {
        setError('Usuario sin sucursal asignada');
        setLoading(false);
        return;
      }

      // For admin users, we might need to handle differently
      if (isAdmin && !profile?.id_sucursal) {
        setInventoryItems([]);
        setLoading(false);
        return;
      }
      
      // Obtener inventario completo con información de productos
      const { data, error: fetchError } = await supabase
        .from('inventarios')
        .select(`
          *,
          productos (
            id_producto,
            codigo_mrp,
            codigo_truper,
            marca,
            descripcion
          )
        `)
        .eq('id_sucursal', profile.id_sucursal)
        .order('ultimo_conteo', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Formatear datos para la UI
      const formattedItems = (data || []).map(item => ({
        id: item.id_inventario,
        productId: item.id_producto,
        name: item.productos?.descripcion || 'Producto sin descripción',
        brand: item.productos?.marca || 'Sin marca',
        barcode: item.productos?.codigo_mrp || item.productos?.codigo_truper || 'N/A',
        quantity: item.cantidad_actual,
        unit: 'UDS', // Valor fijo por ahora, puedes cambiarlo según tu lógica de negocio
        lastCounted: new Date(item.ultimo_conteo).toLocaleString('es-MX', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastCountedFull: new Date(item.ultimo_conteo).toLocaleString('es-MX'),
        isLowStock: item.cantidad_actual <= 10,
        isRecentlyCounted: (Date.now() - new Date(item.ultimo_conteo).getTime()) < 24 * 60 * 60 * 1000
      }));

      setInventoryItems(formattedItems);
    } catch (error) {
      console.error('Error cargando inventario:', error);
      setError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar items
  const filteredAndSortedItems = inventoryItems
    .filter(item => {
      // Filtrar por término de búsqueda
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtrar por categoría
      let matchesFilter = true;
      if (filterBy === 'low') {
        matchesFilter = item.isLowStock;
      } else if (filterBy === 'recent') {
        matchesFilter = item.isRecentlyCounted;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'quantity':
          return b.quantity - a.quantity;
        case 'lastCounted':
          return new Date(b.lastCountedFull) - new Date(a.lastCountedFull);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getStockColor = (quantity) => {
    if (quantity === 0) return 'text-red-400 bg-red-500/20 border-red-400/30';
    if (quantity <= 5) return 'text-orange-400 bg-orange-500/20 border-orange-400/30';
    if (quantity <= 10) return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';
    return 'text-green-400 bg-green-500/20 border-green-400/30';
  };

  const getFilterCount = (filter) => {
    switch (filter) {
      case 'low':
        return inventoryItems.filter(item => item.isLowStock).length;
      case 'recent':
        return inventoryItems.filter(item => item.isRecentlyCounted).length;
      default:
        return inventoryItems.length;
    }
  };

  return (
    <div className="h-full">
      <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] transition-all duration-500 ease-out h-full flex flex-col shadow-xl shadow-black/10">
        <div className="relative z-10 p-8 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5-1.5-15z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white/95 tracking-wide">
                  Inventario Actual
                </h3>
                <p className="text-sm text-white/60 font-light">
                  {filteredAndSortedItems.length} productos disponibles
                </p>
              </div>
            </div>
            
            <button
              onClick={loadInventoryData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          {/* Controles de búsqueda y filtros */}
          <div className="mb-6 space-y-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            {/* Filtros y ordenamiento */}
            <div className="flex flex-wrap gap-3">
              {/* Filtros */}
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'low', label: 'Stock Bajo' },
                  { key: 'recent', label: 'Recientes' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setFilterBy(filter.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                      filterBy === filter.key
                        ? 'bg-blue-500/20 border border-blue-400/30 text-blue-300'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                    }`}
                  >
                    {filter.label} ({getFilterCount(filter.key)})
                  </button>
                ))}
              </div>

              {/* Ordenamiento */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-blue-400/50"
              >
                <option value="name">Ordenar por Nombre</option>
                <option value="quantity">Ordenar por Cantidad</option>
                <option value="lastCounted">Ordenar por Último Conteo</option>
              </select>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
                  <div className="w-12 h-12 border-3 border-transparent border-t-blue-400 rounded-full"></div>
                </div>
                <p className="text-white/60 text-sm">Cargando inventario...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredAndSortedItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5-1.5-15z" />
                  </svg>
                </div>
                <h4 className="text-white/70 text-base font-medium mb-2">
                  {searchTerm || filterBy !== 'all' ? 'Sin resultados' : 'Inventario vacío'}
                </h4>
                <p className="text-white/40 text-sm font-light leading-relaxed max-w-xs mx-auto">
                  {searchTerm || filterBy !== 'all' 
                    ? 'No se encontraron productos que coincidan con los filtros'
                    : 'Comienza escaneando productos para construir tu inventario'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Lista de productos */}
          {!loading && filteredAndSortedItems.length > 0 && (
            <div className="flex-1 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {filteredAndSortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideInUp 0.4s ease-out forwards'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Nombre y marca */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-white/95 text-sm truncate group-hover:text-white transition-colors">
                          {item.name}
                        </h4>
                        <span className="px-2 py-1 bg-gray-500/20 border border-gray-400/30 rounded-lg text-xs font-medium text-gray-300 flex-shrink-0">
                          {item.brand}
                        </span>
                      </div>

                      {/* Código de barras */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white/70">
                          {item.barcode}
                        </span>
                        {item.isRecentlyCounted && (
                          <span className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded-lg text-xs font-medium text-green-300">
                            Reciente
                          </span>
                        )}
                      </div>

                      {/* Último conteo */}
                      <p className="text-white/40 text-xs font-light">
                        Último conteo: {item.lastCounted}
                      </p>
                    </div>

                    {/* Cantidad */}
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className={`px-3 py-2 rounded-xl border font-semibold text-sm min-w-[80px] text-center ${getStockColor(item.quantity)}`}>
                        {item.quantity} 
                        <span className="text-xs font-normal ml-1 opacity-80">
                          {item.unit}
                        </span>
                      </div>
                      
                      {item.isLowStock && (
                        <div className="flex items-center space-x-1 text-orange-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-xs font-medium">Stock bajo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Efectos de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-blue-500/8 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-white/5 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
      </div>
    </div>
  );
}

export default InventoryCard;