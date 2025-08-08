import { useState, useEffect, useMemo } from 'react';
import { InventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../Card/Card';
import * as XLSX from 'xlsx';

export function MovementHistoryScreen() {
  const { profile, isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // 'day', 'week', 'month', 'all'
  const [allMovements, setAllMovements] = useState([]); // Store all movements for client-side filtering
  
  const movementsPerPage = 20;

  useEffect(() => {
    if (profile?.id_sucursal || (profile?.role === 'admin' && !profile?.id_sucursal)) {
      loadAllMovements();
    } else if (profile && !profile.id_sucursal && profile.role !== 'admin') {
      setError('Usuario sin sucursal asignada');
      setLoading(false);
    }
  }, [profile]);
  
  // Separate effect for client-side filtering
  useEffect(() => {
    applyFilters();
  }, [allMovements, filterType, dateRange, searchTerm, currentPage]);

  const loadAllMovements = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.id_sucursal && profile?.role !== 'admin') {
        setError('Usuario sin sucursal asignada');
        return;
      }

      if (profile?.role === 'admin' && !profile?.id_sucursal) {
        setMovements([]);
        setTotalPages(1);
        return;
      }

      // Get all movements for client-side filtering
      const fetchedMovements = await InventoryService.getRecentMovements(1000, profile.id_sucursal);
      setAllMovements(fetchedMovements);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      setError('Error al cargar el historial de movimientos');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    if (!allMovements.length) {
      setMovements([]);
      setTotalPages(1);
      return;
    }

    // Start with all movements
    let filtered = [...allMovements];

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
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
      
      if (startDate) {
        filtered = filtered.filter(mov => new Date(mov.fecha_movimiento) >= startDate);
      }
    }

    // Filter by movement type
    if (filterType !== 'all') {
      filtered = filtered.filter(mov => mov.tipo_movimiento === filterType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(mov =>
        mov.productos?.descripcion?.toLowerCase().includes(searchLower) ||
        mov.productos?.codigo_mrp?.toLowerCase().includes(searchLower) ||
        mov.productos?.codigo_truper?.toLowerCase().includes(searchLower) ||
        mov.productos?.marca?.toLowerCase().includes(searchLower) ||
        mov.usuario?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPagesCalculated = Math.ceil(totalItems / movementsPerPage) || 1;
    const startIndex = (currentPage - 1) * movementsPerPage;
    const endIndex = startIndex + movementsPerPage;
    const paginatedMovements = filtered.slice(startIndex, endIndex);

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
      date: new Date(mov.fecha_movimiento),
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
  };

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'entrada':
        return 'text-green-400 bg-green-500/20 border-green-400/30';
      case 'salida':
        return 'text-red-400 bg-red-500/20 border-red-400/30';
      case 'conteo':
      case 'conteo_inicial':
        return 'text-white/90 bg-white/10 border-white/20';
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

  // Debounced search function
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter) => {
    setFilterType(filter);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1);
  };
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!allMovements.length) return { total: 0, today: 0, thisWeek: 0, byType: {} };
    
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayCount = allMovements.filter(mov => new Date(mov.fecha_movimiento) >= today).length;
    const weekCount = allMovements.filter(mov => new Date(mov.fecha_movimiento) >= weekAgo).length;
    
    const byType = allMovements.reduce((acc, mov) => {
      acc[mov.tipo_movimiento] = (acc[mov.tipo_movimiento] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: allMovements.length,
      today: todayCount,
      thisWeek: weekCount,
      byType
    };
  }, [allMovements]);
  
  // Export to Excel function
  const handleExport = () => {
    if (!movements.length) return;
    
    const exportData = movements.map(mov => ({
      'Producto': mov.productName,
      'Marca': mov.productBrand,
      'Código': mov.barcode,
      'Tipo': getMovementTypeLabel(mov.type),
      'Cantidad Anterior': mov.previousQuantity,
      'Cantidad Nueva': mov.newQuantity,
      'Diferencia': mov.difference,
      'Usuario': mov.user,
      'Fecha': mov.fullTimestamp,
      'Observaciones': mov.observations || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Movimientos');
    
    const filename = `historial_movimientos_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-light text-white/95 mb-4">
          Historial de <span className="font-semibold text-red-400">Movimientos</span>
        </h2>
        <p className="text-white/60 font-light text-base md:text-lg max-w-2xl mx-auto">
          Registro completo de todos los movimientos de inventario realizados
        </p>
      </div>

      {/* Statistics Cards */}
      {!loading && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card variant="default" className="text-center">
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-semibold text-white/95">{stats.total}</div>
              <div className="text-xs md:text-sm text-white/60">Total Movimientos</div>
            </div>
          </Card>
          <Card variant="secondary" className="text-center">
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-semibold text-green-400">{stats.today}</div>
              <div className="text-xs md:text-sm text-white/60">Hoy</div>
            </div>
          </Card>
          <Card variant="primary" className="text-center">
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-semibold text-blue-400">{stats.thisWeek}</div>
              <div className="text-xs md:text-sm text-white/60">Esta Semana</div>
            </div>
          </Card>
          <Card variant="default" className="text-center">
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-semibold text-red-400">{stats.byType.conteo || 0}</div>
              <div className="text-xs md:text-sm text-white/60">Conteos</div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card variant="default">
        <div className="space-y-4 md:space-y-6">
          {/* Header with Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-medium text-white/90">Filtros y Búsqueda</h3>
            {!loading && movements.length > 0 && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-xl text-green-200 hover:text-green-100 font-medium transition-colors flex items-center space-x-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Exportar Excel</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por producto, código, marca o usuario..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-red-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Movement Type Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-white/60 mr-2 self-center hidden md:inline">Tipo:</span>
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
                      ? 'bg-red-500/20 border border-red-400/30 text-red-300'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                  {filterType === filter.key && stats.byType[filter.key] && (
                    <span className="ml-1 text-xs opacity-70">({stats.byType[filter.key]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Date Range Filters */}
            <div className="flex gap-2">
              <span className="text-xs text-white/60 mr-2 self-center hidden md:inline">Período:</span>
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

          {/* Results Summary */}
          {!loading && (
            <div className="text-xs text-white/50 pt-2 border-t border-white/5">
              {searchTerm && `Búsqueda: "${searchTerm}" • `}
              {movements.length} de {stats.total} movimientos
              {filterType !== 'all' && ` • Filtro: ${filterType}`}
              {dateRange !== 'all' && ` • Período: ${dateRange}`}
            </div>
          )}
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
            <div className="w-12 h-12 border-3 border-red-400/30 rounded-full animate-spin mx-auto mb-4">
              <div className="w-12 h-12 border-3 border-transparent border-t-red-400 rounded-full"></div>
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
          <div className="space-y-3 md:space-y-4">
            {movements.map((movement, index) => (
              <div
                key={movement.id}
                className="p-3 md:p-4 rounded-xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.08] transition-colors"
                style={{ 
                  animationDelay: `${index * 30}ms`,
                  animation: 'slideInUp 0.3s ease-out forwards'
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                  {/* Left Side - Product Info */}
                  <div className="flex-1 min-w-0">
                    {/* Product Name and Brand */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h4 className="font-medium text-white/95 text-sm lg:text-base truncate">
                        {movement.productName}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-white/10 rounded-md text-xs font-medium text-white/70 flex-shrink-0">
                          {movement.productBrand}
                        </span>
                        <span className={`px-2 py-1 border rounded-md text-xs font-medium flex-shrink-0 ${getMovementTypeColor(movement.type)}`}>
                          {getMovementTypeLabel(movement.type)}
                        </span>
                      </div>
                    </div>

                    {/* Barcode */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-white/70">
                        {movement.barcode}
                      </span>
                    </div>

                    {/* User and Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span>{movement.user}</span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{movement.timestamp}</span>
                      </div>
                    </div>

                    {/* Observations */}
                    {movement.observations && (
                      <div className="mt-2 p-2 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/60 italic">
                          💬 {movement.observations}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Quantity Changes */}
                  <div className="flex items-center lg:flex-col lg:items-end justify-between lg:justify-start gap-2 lg:gap-1 lg:min-w-[120px]">
                    {/* Mobile Layout */}
                    <div className="lg:hidden flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-white/60 text-xs">Anterior</div>
                        <div className="text-white/90 font-semibold">{movement.previousQuantity}</div>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="text-white/60 text-xs">Nueva</div>
                        <div className="text-white/90 font-semibold">{movement.newQuantity}</div>
                      </div>
                      {movement.difference !== 0 && (
                        <div className={`px-2 py-1 rounded-md text-xs font-semibold ${getDifferenceColor(movement.difference)} ${movement.difference > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {movement.difference > 0 ? '+' : ''}{movement.difference}
                        </div>
                      )}
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex lg:flex-col lg:items-end lg:space-y-1">
                      <div className="text-right">
                        <div className="text-white/60 text-xs">Anterior</div>
                        <div className="text-white/90 font-medium text-lg">{movement.previousQuantity}</div>
                      </div>
                      <div className="text-center text-white/40 py-1">
                        <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 text-xs">Nueva</div>
                        <div className="text-white/90 font-medium text-lg">{movement.newQuantity}</div>
                      </div>
                      {movement.difference !== 0 && (
                        <div className={`px-2 py-1 rounded-md text-sm font-semibold mt-2 ${getDifferenceColor(movement.difference)} ${movement.difference > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {movement.difference > 0 ? '+' : ''}{movement.difference}
                        </div>
                      )}
                    </div>
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
                          ? 'bg-red-500/20 border border-red-400/30 text-red-300'
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