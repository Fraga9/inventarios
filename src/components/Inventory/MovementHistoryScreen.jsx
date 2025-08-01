import { useState, useEffect } from 'react';
import { InventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../Card/Card';

export function MovementHistoryScreen() {
  const { profile, isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('week'); // 'day', 'week', 'month', 'all'
  
  const movementsPerPage = 20;

  useEffect(() => {
    if (profile) {
      loadMovements();
    }
  }, [profile, currentPage, filterType, dateRange]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.id_sucursal && !isAdmin) {
        setError('Usuario sin sucursal asignada');
        return;
      }

      if (isAdmin && !profile?.id_sucursal) {
        setMovements([]);
        setTotalPages(1);
        return;
      }

      // Calculate date filter
      let startDate = null;
      const now = new Date();
      switch (dateRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      // Get movements with pagination
      const allMovements = await InventoryService.getRecentMovements(1000, profile.id_sucursal, startDate);
      
      // Filter by movement type if needed
      let filteredMovements = allMovements;
      if (filterType !== 'all') {
        filteredMovements = allMovements.filter(mov => mov.tipo_movimiento === filterType);
      }

      // Filter by search term
      if (searchTerm) {
        filteredMovements = filteredMovements.filter(mov =>
          mov.productos?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mov.productos?.codigo_mrp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mov.productos?.codigo_truper?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mov.productos?.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mov.usuario?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Calculate pagination
      const totalItems = filteredMovements.length;
      const totalPagesCalculated = Math.ceil(totalItems / movementsPerPage);
      const startIndex = (currentPage - 1) * movementsPerPage;
      const endIndex = startIndex + movementsPerPage;
      const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

      // Format movements for UI
      const formattedMovements = paginatedMovements.map(mov => ({
        id: mov.id_movimiento,
        productName: mov.productos?.descripcion || 'Producto sin descripción',
        productBrand: mov.productos?.marca || 'Sin marca',
        barcode: mov.productos?.codigo_mrp || mov.productos?.codigo_truper || 'N/A',
        type: mov.tipo_movimiento,
        previousQuantity: mov.cantidad_anterior,
        newQuantity: mov.cantidad_nueva,
        difference: mov.cantidad_nueva - mov.cantidad_anterior,
        user: mov.usuario,
        timestamp: new Date(mov.fecha_movimiento).toLocaleString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(mov.fecha_movimiento).toLocaleString('es-MX'),
        observations: mov.observaciones
      }));

      setMovements(formattedMovements);
      setTotalPages(totalPagesCalculated);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      setError('Error al cargar el historial de movimientos');
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'entrada':
        return 'text-green-400 bg-green-500/20 border-green-400/30';
      case 'salida':
        return 'text-red-400 bg-red-500/20 border-red-400/30';
      case 'conteo':
      case 'conteo_inicial':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30';
      case 'ajuste':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';
      case 'merma':
        return 'text-orange-400 bg-orange-500/20 border-orange-400/30';
      case 'devolucion':
        return 'text-purple-400 bg-purple-500/20 border-purple-400/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30';
    }
  };

  const getMovementTypeLabel = (type) => {
    const labels = {
      'entrada': 'Entrada',
      'salida': 'Salida',
      'conteo': 'Conteo',
      'conteo_inicial': 'Conteo Inicial',
      'ajuste': 'Ajuste',
      'merma': 'Merma',
      'devolucion': 'Devolución'
    };
    return labels[type] || type;
  };

  const getDifferenceColor = (diff) => {
    if (diff > 0) return 'text-green-400';
    if (diff < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filter) => {
    setFilterType(filter);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to first page when changing date range
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-white/95 mb-4">
          Historial de <span className="font-semibold text-red-400">Movimientos</span>
        </h2>
        <p className="text-white/60 font-light text-lg max-w-2xl mx-auto">
          Registro completo de todos los movimientos de inventario realizados
        </p>
      </div>

      {/* Filters and Search */}
      <Card variant="default" className="mb-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por producto, código, marca o usuario..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Movement Type Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'conteo', label: 'Conteos' },
                { key: 'entrada', label: 'Entradas' },
                { key: 'salida', label: 'Salidas' },
                { key: 'ajuste', label: 'Ajustes' },
                { key: 'merma', label: 'Mermas' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => handleFilterChange(filter.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterType === filter.key
                      ? 'bg-blue-500/20 border border-blue-400/30 text-blue-300'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Date Range Filters */}
            <div className="flex gap-2">
              {[
                { key: 'day', label: 'Hoy' },
                { key: 'week', label: '7 días' },
                { key: 'month', label: '30 días' },
                { key: 'all', label: 'Todo' }
              ].map(range => (
                <button
                  key={range.key}
                  onClick={() => handleDateRangeChange(range.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    dateRange === range.key
                      ? 'bg-red-500/20 border border-red-400/30 text-red-300'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="default">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-xl bg-red-500/15 border border-red-400/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h4 className="text-red-300 text-lg font-medium mb-2">Error al cargar datos</h4>
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
            <p className="text-white/60 text-sm">Cargando historial de movimientos...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && movements.length === 0 && (
        <Card variant="default">
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M12 8.25v13.5M8.25 21h7.5" />
              </svg>
            </div>
            <h4 className="text-white/70 text-base font-medium mb-2">
              Sin movimientos registrados
            </h4>
            <p className="text-white/40 text-sm">
              No se encontraron movimientos con los filtros seleccionados
            </p>
          </div>
        </Card>
      )}

      {/* Movements List */}
      {!loading && movements.length > 0 && (
        <Card variant="default">
          <div className="space-y-4">
            {movements.map((movement, index) => (
              <div
                key={movement.id}
                className="p-4 rounded-xl bg-white/[0.06] border border-white/[0.12]"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'slideInUp 0.3s ease-out forwards'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Product Info */}
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-white/95 text-sm truncate">
                        {movement.productName}
                      </h4>
                      <span className="px-2 py-1 bg-gray-500/15 rounded-md text-xs font-medium text-gray-300 flex-shrink-0">
                        {movement.productBrand}
                      </span>
                    </div>

                    {/* Barcode and Type */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-white/70">
                        {movement.barcode}
                      </span>
                      <span className={`px-2 py-1 border rounded-md text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                        {getMovementTypeLabel(movement.type)}
                      </span>
                    </div>

                    {/* User and Timestamp */}
                    <div className="flex items-center space-x-4 text-xs text-white/40">
                      <span>Por: {movement.user}</span>
                      <span>•</span>
                      <span>{movement.timestamp}</span>
                    </div>

                    {/* Observations */}
                    {movement.observations && (
                      <p className="text-xs text-white/50 mt-2 italic">
                        {movement.observations}
                      </p>
                    )}
                  </div>

                  {/* Quantity Changes */}
                  <div className="flex flex-col items-end space-y-1 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-white/70 text-xs">Anterior</div>
                      <div className="text-white/90 font-medium">{movement.previousQuantity}</div>
                    </div>
                    <div className="text-center text-white/40">→</div>
                    <div className="text-right">
                      <div className="text-white/70 text-xs">Nueva</div>
                      <div className="text-white/90 font-medium">{movement.newQuantity}</div>
                    </div>
                    {movement.difference !== 0 && (
                      <div className={`text-xs font-medium ${getDifferenceColor(movement.difference)}`}>
                        {movement.difference > 0 ? '+' : ''}{movement.difference}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && movements.length > 0 && totalPages > 1 && (
        <Card variant="default">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              Página {currentPage} de {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              
              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
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
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}