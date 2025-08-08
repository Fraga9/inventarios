import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../Card/Card';

export function CurrentInventoryScreen() {
  const { profile, isAdmin } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  const itemsPerPage = 50;

  useEffect(() => {
    if (profile?.id_sucursal || (profile?.role === 'admin' && !profile?.id_sucursal)) {
      loadInventoryData();
    } else if (profile && !profile.id_sucursal && profile.role !== 'admin') {
      setError('Usuario sin sucursal asignada');
      setLoading(false);
    }
  }, [profile]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.id_sucursal && profile?.role !== 'admin') {
        setError('Usuario sin sucursal asignada');
        return;
      }

      if (profile?.role === 'admin' && !profile?.id_sucursal) {
        setInventoryItems([]);
        setStats({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
        return;
      }

      // Load complete inventory with product information
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

      // Format data for UI
      const formattedItems = (data || []).map(item => ({
        id: item.id_inventario,
        productId: item.id_producto,
        name: item.productos?.descripcion || 'Producto sin descripción',
        brand: item.productos?.marca || 'Sin marca',
        barcode: item.productos?.codigo_mrp || item.productos?.codigo_truper || 'N/A',
        quantity: item.cantidad_actual,
        lastCounted: new Date(item.ultimo_conteo),
        lastCountedFormatted: new Date(item.ultimo_conteo).toLocaleString('es-MX', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isLowStock: item.cantidad_actual <= 10,
        isOutOfStock: item.cantidad_actual === 0,
        isRecentlyCounted: (Date.now() - new Date(item.ultimo_conteo).getTime()) < 24 * 60 * 60 * 1000,
        daysSinceCount: Math.floor((Date.now() - new Date(item.ultimo_conteo).getTime()) / (24 * 60 * 60 * 1000))
      }));

      // Calculate statistics
      const totalItems = formattedItems.length;
      const lowStockItems = formattedItems.filter(item => item.isLowStock && !item.isOutOfStock).length;
      const outOfStockItems = formattedItems.filter(item => item.isOutOfStock).length;

      setInventoryItems(formattedItems);
      setStats({
        total: totalItems,
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
        totalValue: 0 // Remove price calculations since precio_venta doesn't exist
      });

    } catch (error) {
      console.error('Error cargando inventario:', error);
      setError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtering and sorting for performance with large datasets
  const filteredAndSortedItems = useMemo(() => {
    let filtered = inventoryItems.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      let matchesFilter = true;
      switch (filterBy) {
        case 'outOfStock':
          matchesFilter = item.isOutOfStock;
          break;
        case 'lowStock':
          matchesFilter = item.isLowStock && !item.isOutOfStock;
          break;
        case 'inStock':
          matchesFilter = item.quantity > 10;
          break;
        case 'recent':
          matchesFilter = item.isRecentlyCounted;
          break;
        case 'old':
          matchesFilter = item.daysSinceCount > 7;
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'brand':
          comparison = a.brand.localeCompare(b.brand);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'lastCounted':
          comparison = a.lastCounted - b.lastCounted;
          break;
        case 'barcode':
          comparison = a.barcode.localeCompare(b.barcode);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [inventoryItems, searchTerm, filterBy, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);

  const getStockStatusColor = (item) => {
    if (item.isOutOfStock) return 'text-red-400 bg-red-500/20 border-red-400/30';
    if (item.isLowStock) return 'text-orange-400 bg-orange-500/20 border-orange-400/30';
    return 'text-green-400 bg-green-500/20 border-green-400/30';
  };

  const getStockStatusLabel = (item) => {
    if (item.isOutOfStock) return 'Sin Stock';
    if (item.isLowStock) return 'Stock Bajo';
    return 'Disponible';
  };


  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleFilter = (filter) => {
    setFilterBy(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFilterCount = (filter) => {
    switch (filter) {
      case 'outOfStock':
        return inventoryItems.filter(item => item.isOutOfStock).length;
      case 'lowStock':
        return inventoryItems.filter(item => item.isLowStock && !item.isOutOfStock).length;
      case 'inStock':
        return inventoryItems.filter(item => item.quantity > 10).length;
      case 'recent':
        return inventoryItems.filter(item => item.isRecentlyCounted).length;
      case 'old':
        return inventoryItems.filter(item => item.daysSinceCount > 7).length;
      default:
        return inventoryItems.length;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-white/95 mb-4">
          Inventario <span className="font-semibold text-red-400">Actual</span>
        </h2>
        <p className="text-white/60 font-light text-lg max-w-2xl mx-auto">
          Vista completa del inventario actual con herramientas avanzadas de búsqueda y análisis
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="default" className="text-center">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-white/95">{stats.total}</div>
            <div className="text-sm text-white/60">Total Productos</div>
          </div>
        </Card>
        <Card variant="secondary" className="text-center">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-orange-400">{stats.lowStock}</div>
            <div className="text-sm text-white/60">Stock Bajo</div>
          </div>
        </Card>
        <Card variant="primary" className="text-center">
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-red-400">{stats.outOfStock}</div>
            <div className="text-sm text-white/60">Sin Stock</div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card variant="default">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, marca o código de barras..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4 justify-between items-center">
            {/* Stock Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'inStock', label: 'En Stock' },
                { key: 'lowStock', label: 'Stock Bajo' },
                { key: 'outOfStock', label: 'Sin Stock' },
                { key: 'recent', label: 'Recientes' },
                { key: 'old', label: 'Sin Contar' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => handleFilter(filter.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterBy === filter.key
                      ? 'bg-blue-500/20 border border-blue-400/30 text-blue-300'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {filter.label} ({getFilterCount(filter.key)})
                </button>
              ))}
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-blue-400/50"
              >
                <option value="name">Nombre</option>
                <option value="brand">Marca</option>
                <option value="quantity">Cantidad</option>
                <option value="lastCounted">Último Conteo</option>
                <option value="barcode">Código</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-all"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="flex justify-between items-center text-sm text-white/60">
            <span>
              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedItems.length)} de {filteredAndSortedItems.length} productos
            </span>
            <span>
              Página {currentPage} de {totalPages}
            </span>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="primary">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-xl bg-red-500/15 border border-red-400/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h4 className="text-red-300 text-lg font-medium mb-2">Error al cargar inventario</h4>
            <p className="text-red-200/70 text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card variant="default">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
              <div className="w-12 h-12 border-3 border-transparent border-t-blue-400 rounded-full"></div>
            </div>
            <p className="text-white/60 text-sm">Cargando inventario completo...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedItems.length === 0 && (
        <Card variant="default">
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5-1.5-15z" />
              </svg>
            </div>
            <h4 className="text-white/70 text-base font-medium mb-2">
              Sin productos encontrados
            </h4>
            <p className="text-white/40 text-sm">
              No se encontraron productos que coincidan con los filtros seleccionados
            </p>
          </div>
        </Card>
      )}

      {/* Inventory Table */}
      {!loading && paginatedItems.length > 0 && (
        <Card variant="default">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/70 font-medium text-sm">
                    <button 
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-1 hover:text-white transition-colors"
                    >
                      <span>Producto</span>
                      {sortBy === 'name' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-white/70 font-medium text-sm">
                    <button 
                      onClick={() => handleSort('brand')}
                      className="flex items-center space-x-1 hover:text-white transition-colors"
                    >
                      <span>Marca</span>
                      {sortBy === 'brand' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-white/70 font-medium text-sm">Código</th>
                  <th className="text-center py-3 px-4 text-white/70 font-medium text-sm">
                    <button 
                      onClick={() => handleSort('quantity')}
                      className="flex items-center space-x-1 hover:text-white transition-colors mx-auto"
                    >
                      <span>Cantidad</span>
                      {sortBy === 'quantity' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="text-center py-3 px-4 text-white/70 font-medium text-sm">Estado</th>
                  <th className="text-center py-3 px-4 text-white/70 font-medium text-sm">
                    <button 
                      onClick={() => handleSort('lastCounted')}
                      className="flex items-center space-x-1 hover:text-white transition-colors mx-auto"
                    >
                      <span>Último Conteo</span>
                      {sortBy === 'lastCounted' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    style={{ 
                      animationDelay: `${index * 20}ms`,
                      animation: 'slideInUp 0.3s ease-out forwards'
                    }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-white/90 font-medium text-sm">{item.name}</span>
                        {item.isRecentlyCounted && (
                          <span className="text-green-400 text-xs">Recién contado</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/70 text-sm">{item.brand}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/60 text-xs font-mono bg-white/5 px-2 py-1 rounded">
                        {item.barcode}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/90 font-semibold">{item.quantity}</span>
                      <span className="text-white/50 text-xs ml-1">UDS</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStockStatusColor(item)}`}>
                        {getStockStatusLabel(item)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-white/70 text-xs">{item.lastCountedFormatted}</span>
                        <span className={`text-xs ${item.daysSinceCount > 7 ? 'text-orange-400' : 'text-white/40'}`}>
                          {item.daysSinceCount === 0 ? 'Hoy' : `${item.daysSinceCount}d`}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredAndSortedItems.length > 0 && totalPages > 1 && (
        <Card variant="default">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              Página {currentPage} de {totalPages} ({filteredAndSortedItems.length} productos)
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              
              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-500/20 border border-blue-400/30 text-blue-300'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                »»
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}