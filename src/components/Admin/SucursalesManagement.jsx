import { useState, useEffect } from 'react';
import { AdminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

export function SucursalesManagement() {
  const { isAdmin } = useAuth();
  const [sucursales, setSucursales] = useState([]);
  const [filteredSucursales, setFilteredSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para filtros y ordenación
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nombre'); // nombre, region, actividad, stock
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState(null);

  // Estados para formularios
  const [formData, setFormData] = useState({
    nombre: '',
    region: '',
    direccion: ''
  });

  useEffect(() => {
    if (isAdmin) {
      loadSucursales();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterAndSortSucursales();
  }, [sucursales, searchTerm, sortBy, sortOrder]);

  const loadSucursales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminService.getSucursalesWithMetrics();
      setSucursales(data);
    } catch (error) {
      console.error('Error loading sucursales:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSucursales = () => {
    let filtered = [...sucursales];

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(sucursal => 
        sucursal.Sucursal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sucursal.Región.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sucursal.Dirección && sucursal.Dirección.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Aplicar ordenación
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'nombre':
          aValue = a.Sucursal.toLowerCase();
          bValue = b.Sucursal.toLowerCase();
          break;
        case 'region':
          aValue = a.Región.toLowerCase();
          bValue = b.Región.toLowerCase();
          break;
        case 'actividad':
          aValue = a.metricas.movimientosMes;
          bValue = b.metricas.movimientosMes;
          break;
        case 'stock':
          aValue = a.metricas.totalUnidades;
          bValue = b.metricas.totalUnidades;
          break;
        case 'usuarios':
          aValue = a.metricas.usuariosAsignados;
          bValue = b.metricas.usuariosAsignados;
          break;
        default:
          aValue = a.Sucursal.toLowerCase();
          bValue = b.Sucursal.toLowerCase();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredSucursales(filtered);
  };

  const handleCreateSucursal = async (e) => {
    e.preventDefault();
    try {
      await AdminService.createSucursal(formData);
      setShowCreateModal(false);
      resetForm();
      await loadSucursales();
      alert('Sucursal creada exitosamente');
    } catch (error) {
      alert(`Error al crear sucursal: ${error.message}`);
    }
  };

  const handleEditSucursal = async (e) => {
    e.preventDefault();
    try {
      await AdminService.updateSucursal(selectedSucursal.id_sucursal, formData);
      setShowEditModal(false);
      resetForm();
      setSelectedSucursal(null);
      await loadSucursales();
      alert('Sucursal actualizada exitosamente');
    } catch (error) {
      alert(`Error al actualizar sucursal: ${error.message}`);
    }
  };


  const handleDeleteSucursal = async () => {
    try {
      await AdminService.deleteSucursal(selectedSucursal.id_sucursal);
      setShowDeleteModal(false);
      setSelectedSucursal(null);
      await loadSucursales();
      alert('Sucursal eliminada exitosamente');
    } catch (error) {
      alert(`Error al eliminar sucursal: ${error.message}`);
    }
  };

  const openEditModal = (sucursal) => {
    setSelectedSucursal(sucursal);
    setFormData({
      nombre: sucursal.Sucursal,
      region: sucursal.Región,
      direccion: sucursal.Dirección || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (sucursal) => {
    setSelectedSucursal(sucursal);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      region: '',
      direccion: ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/60">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-3 border-red-400/30 rounded-full animate-spin">
            <div className="w-12 h-12 border-3 border-transparent border-t-red-400 rounded-full"></div>
          </div>
          <p className="text-white/90 font-medium">Cargando sucursales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-light text-white/95">
            Gestión de <span className="font-semibold text-red-400">Sucursales</span>
          </h3>
          <p className="text-white/60 text-sm mt-1">
            {filteredSucursales.length} de {sucursales.length} sucursales
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="group relative px-6 py-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 hover:text-red-200 hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300 ease-out font-medium text-sm active:scale-95 hover:shadow-lg hover:shadow-red-500/20"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Nueva Sucursal</span>
          </div>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
        {/* Búsqueda */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar sucursales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all text-sm"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Ordenar por */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="nombre" className="bg-slate-800">Nombre</option>
          <option value="region" className="bg-slate-800">Región</option>
          <option value="actividad" className="bg-slate-800">Actividad</option>
          <option value="stock" className="bg-slate-800">Stock</option>
          <option value="usuarios" className="bg-slate-800">Usuarios</option>
        </select>

        {/* Orden */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="asc" className="bg-slate-800">Ascendente</option>
          <option value="desc" className="bg-slate-800">Descendente</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de sucursales */}
      <div className="space-y-4">
        {filteredSucursales.map((sucursal) => (
          <div
            key={sucursal.id_sucursal}
            className="relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] hover:from-white/[0.10] hover:via-white/[0.06] hover:to-white/[0.04] transition-all duration-300"
          >
            <div className="p-6">
              {/* Header de sucursal */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-white/95">{sucursal.Sucursal}</h4>
                  </div>
                  <p className="text-white/60 text-sm mb-1">{sucursal.Región}</p>
                  {sucursal.Dirección && (
                    <p className="text-white/50 text-xs">{sucursal.Dirección}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(sucursal)}
                    className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-all"
                    title="Editar sucursal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>

                  <button
                    onClick={() => openDeleteModal(sucursal)}
                    className="p-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all"
                    title="Eliminar sucursal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-lg font-semibold text-white/90">{sucursal.metricas.totalProductos}</div>
                  <div className="text-xs text-white/50">Productos</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-lg font-semibold text-red-400">{sucursal.metricas.totalUnidades}</div>
                  <div className="text-xs text-white/50">Unidades</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-lg font-semibold text-blue-400">{sucursal.metricas.usuariosAsignados}</div>
                  <div className="text-xs text-white/50">Usuarios</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-lg font-semibold text-green-400">{sucursal.metricas.movimientosMes}</div>
                  <div className="text-xs text-white/50">Mov. mes</div>
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Bajo stock: {sucursal.metricas.productosBajoStock} productos</span>
                <span>Último conteo: {formatDate(sucursal.metricas.ultimoConteo)}</span>
                <span>Stock: {sucursal.metricas.porcentajeStock}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSucursales.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-white/60 mb-2">No se encontraron sucursales</p>
          <p className="text-white/40 text-sm">Ajusta los filtros o crea una nueva sucursal</p>
        </div>
      )}

      {/* Modal de crear sucursal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white/95">Nueva Sucursal</h3>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateSucursal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    placeholder="Nombre de la sucursal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Región *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    placeholder="Región donde se ubica"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Dirección</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 resize-none"
                    placeholder="Dirección completa (opcional)"
                    rows="3"
                  />
                </div>


                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                    className="flex-1 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white/80 hover:bg-white/20 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 hover:bg-red-500/30 transition-all"
                  >
                    Crear Sucursal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar sucursal */}
      {showEditModal && selectedSucursal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white/95">Editar Sucursal</h3>
                <button
                  onClick={() => { setShowEditModal(false); resetForm(); setSelectedSucursal(null); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSucursal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    placeholder="Nombre de la sucursal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Región *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    placeholder="Región donde se ubica"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Dirección</label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
                    placeholder="Dirección completa (opcional)"
                    rows="3"
                  />
                </div>


                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); resetForm(); setSelectedSucursal(null); }}
                    className="flex-1 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white/80 hover:bg-white/20 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300 hover:bg-blue-500/30 transition-all"
                  >
                    Actualizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminar sucursal */}
      {showDeleteModal && selectedSucursal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] shadow-2xl">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 rounded-2xl bg-red-500/20 border border-red-400/30">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-medium text-white/95">Eliminar Sucursal</h3>
                  <p className="text-sm text-white/60">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/20">
                <p className="text-white/80 text-sm mb-3">
                  ¿Estás seguro de que deseas eliminar permanentemente la sucursal:
                </p>
                <div className="p-3 bg-white/10 rounded-lg border border-white/20">
                  <p className="font-semibold text-white/95">{selectedSucursal.Sucursal}</p>
                  <p className="text-xs text-white/60">{selectedSucursal.Región}</p>
                </div>
                <p className="text-xs text-red-300 mt-3">
                  Solo se pueden eliminar sucursales inactivas sin usuarios, inventario ni historial.
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedSucursal(null); }}
                  className="flex-1 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white/80 hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSucursal}
                  className="flex-1 py-3 px-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}