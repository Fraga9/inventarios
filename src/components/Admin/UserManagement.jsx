import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

export function UserManagement() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para filtros y ordenación
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, admin, sucursal
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [filterSucursal, setFilterSucursal] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, role, sucursal, created
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createMethod, setCreateMethod] = useState('invitation'); // invite, direct, invitation

  // Estados para formularios
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    idSucursal: '',
    role: 'sucursal',
    password: '' // Solo para creación directa
  });

  // Estados para edición de sucursal
  const [editSucursalData, setEditSucursalData] = useState({
    idSucursal: ''
  });

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData, sucursalesData] = await Promise.all([
        AuthService.getAllUsers(),
        AuthService.getSucursales()
      ]);
      
      setUsers(usersData);
      setSucursales(sucursalesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { email, fullName, idSucursal, role, password } = formData;
      
      console.log('Form data before validation:', formData);
      
      if (!email || !fullName) {
        throw new Error('Email y nombre son requeridos');
      }

      if (role === 'sucursal' && !idSucursal) {
        throw new Error('La sucursal es requerida para usuarios de sucursal');
      }

      let result;
      
      if (createMethod === 'invite') {
        // Método de invitación por email (requiere service key)
        result = await AuthService.inviteUser(
          email, 
          fullName, 
          idSucursal ? parseInt(idSucursal) : null, 
          role
        );
        alert('✅ Invitación enviada exitosamente. El usuario recibirá un email para completar su registro.');
        
      } else if (createMethod === 'direct') {
        // Método de creación directa (requiere service key)
        if (!password) {
          throw new Error('La contraseña es requerida para creación directa');
        }
        
        console.log('Sending data to createUserForSucursal:', {
          email,
          password: '[HIDDEN]',
          fullName,
          idSucursal,
          parsedIdSucursal: idSucursal ? parseInt(idSucursal) : null,
          role
        });
        
        result = await AuthService.createUserForSucursal(
          email, 
          password, 
          fullName, 
          idSucursal ? parseInt(idSucursal) : null, 
          role
        );
        
        console.log('createUserForSucursal result:', result);
        alert('✅ Usuario creado exitosamente. Ya puede iniciar sesión.');
        
      } else if (createMethod === 'invitation') {
        // Método alternativo de invitación (funciona sin service key)
        result = await AuthService.createUserInvitation(
          email, 
          fullName, 
          idSucursal ? parseInt(idSucursal) : null, 
          role
        );
        alert(`✅ ${result.message}\n\nEl usuario debe registrarse normalmente usando este email y será asignado automáticamente a la sucursal.`);
      }
      
      setShowCreateModal(false);
      resetForm();
      await loadData();
      
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Si el error es por falta de configuración admin, sugerir método alternativo
      if (error.message.includes('VITE_SUPABASE_SERVICE_KEY')) {
        alert(`${error.message}\n\n💡 Sugerencia: Usa el método "Invitación Manual" que no requiere configuración adicional, o configura la Service Role Key en tu archivo .env`);
      } else {
        alert(`Error al crear usuario: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, newRole, newSucursal) => {
    try {
      await AuthService.updateUserRole(userId, newRole, newSucursal);
      await loadData();
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error al actualizar usuario: ${error.message}`);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await AuthService.deactivateUser(userId);
        alert('Usuario desactivado');
      } else {
        await AuthService.activateUser(userId);
        alert('Usuario activado');
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert(`Error al cambiar estado: ${error.message}`);
    }
  };

  const openSucursalModal = (user) => {
    setSelectedUser(user);
    setEditSucursalData({
      idSucursal: user.id_sucursal || ''
    });
    setShowSucursalModal(true);
  };

  const handleChangeSucursal = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const newIdSucursal = editSucursalData.idSucursal ? parseInt(editSucursalData.idSucursal) : null;
      
      await AuthService.updateUserRole(selectedUser.id, selectedUser.role, newIdSucursal);
      
      setShowSucursalModal(false);
      setSelectedUser(null);
      setEditSucursalData({ idSucursal: '' });
      await loadData();
      
      const sucursalName = newIdSucursal 
        ? sucursales.find(s => s.id_sucursal === newIdSucursal)?.Sucursal || 'Desconocida'
        : 'Sin asignar';
        
      alert(`✅ Sucursal actualizada exitosamente.\n\n${selectedUser.full_name} ahora está asignado a: ${sucursalName}`);
      
    } catch (error) {
      console.error('Error changing sucursal:', error);
      alert(`Error al cambiar sucursal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      idSucursal: '',
      role: 'sucursal',
      password: ''
    });
  };

  // Filtrar y ordenar usuarios
  const getFilteredUsers = () => {
    let filtered = [...users];

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.sucursales?.Sucursal && user.sucursales.Sucursal.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Aplicar filtro de rol
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Aplicar filtro de estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.is_active : !user.is_active
      );
    }

    // Aplicar filtro de sucursal
    if (filterSucursal !== 'all') {
      filtered = filtered.filter(user => 
        user.id_sucursal === parseInt(filterSucursal)
      );
    }

    // Aplicar ordenación
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.full_name?.toLowerCase() || '';
          bValue = b.full_name?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'sucursal':
          aValue = a.sucursales?.Sucursal?.toLowerCase() || '';
          bValue = b.sucursales?.Sucursal?.toLowerCase() || '';
          break;
        case 'created':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          aValue = a.full_name?.toLowerCase() || '';
          bValue = b.full_name?.toLowerCase() || '';
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
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
          <p className="text-white/90 font-medium">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-light text-white/95">
            Gestión de <span className="font-semibold text-red-400">Usuarios</span>
          </h3>
          <p className="text-white/60 text-sm mt-1">
            {filteredUsers.length} de {users.length} usuarios
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="group relative px-6 py-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 hover:text-red-200 hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300 ease-out font-medium text-sm active:scale-95 hover:shadow-lg hover:shadow-red-500/20"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            <span>Crear Usuario</span>
          </div>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
        {/* Búsqueda */}
        <div className="relative lg:col-span-2">
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all text-sm"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filtro de rol */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="all" className="bg-slate-800">Todos los roles</option>
          <option value="admin" className="bg-slate-800">Administradores</option>
          <option value="sucursal" className="bg-slate-800">Usuarios sucursal</option>
        </select>

        {/* Filtro de estado */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="all" className="bg-slate-800">Todos</option>
          <option value="active" className="bg-slate-800">Activos</option>
          <option value="inactive" className="bg-slate-800">Inactivos</option>
        </select>

        {/* Filtro de sucursal */}
        <select
          value={filterSucursal}
          onChange={(e) => setFilterSucursal(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="all" className="bg-slate-800">Todas las sucursales</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id_sucursal} value={sucursal.id_sucursal} className="bg-slate-800">
              {sucursal.Sucursal}
            </option>
          ))}
        </select>

        {/* Ordenar por */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 text-sm"
        >
          <option value="name" className="bg-slate-800">Nombre</option>
          <option value="role" className="bg-slate-800">Rol</option>
          <option value="sucursal" className="bg-slate-800">Sucursal</option>
          <option value="created" className="bg-slate-800">Fecha creación</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] hover:from-white/[0.10] hover:via-white/[0.06] hover:to-white/[0.04] transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-red-600/20 border border-red-400/30 rounded-xl flex items-center justify-center">
                    <span className="text-red-300 font-semibold text-lg">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.id.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="text-lg font-semibold text-white/95">{user.full_name || 'Sin nombre'}</h4>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Sucursal'}
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        user.is_active ? 'bg-green-400' : 'bg-red-400'
                      }`} title={user.is_active ? 'Activo' : 'Inactivo'}></div>
                    </div>
                    <p className="text-white/60 text-sm mb-1">{user.id.slice(0, 25)}...</p>
                    {user.role === 'sucursal' && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white/50 text-xs">Sucursal:</span>
                        {user.sucursales ? (
                          <span className="text-green-400 text-xs font-medium">{user.sucursales.Sucursal} - {user.sucursales.Región}</span>
                        ) : (
                          <span className="text-red-400 text-xs">Sin asignar</span>
                        )}
                      </div>
                    )}
                    <p className="text-white/40 text-xs">Creado: {formatDate(user.created_at)}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2">
                  {/* Toggle Status */}
                  <button
                    onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                    className={`p-2 rounded-xl border transition-all ${
                      user.is_active 
                        ? 'bg-red-500/10 border-red-400/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-green-500/10 border-green-400/30 text-green-300 hover:bg-green-500/20'
                    }`}
                    title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                  >
                    {user.is_active ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>

                  {/* Change Sucursal (only for sucursal users) */}
                  {user.role === 'sucursal' && (
                    <button
                      onClick={() => openSucursalModal(user)}
                      className="p-2 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all"
                      title="Cambiar sucursal"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 18l-3-3m0 0l-3 3m3-3v-12" />
                      </svg>
                    </button>
                  )}

                  {/* Edit Role */}
                  <select
                    defaultValue={user.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const newSucursal = newRole === 'admin' ? null : user.id_sucursal;
                      if (window.confirm(`¿Cambiar rol de ${user.full_name} a ${newRole}?`)) {
                        handleUpdateUser(user.id, newRole, newSucursal);
                      }
                    }}
                    className="px-3 py-2 bg-blue-500/10 border border-blue-400/30 rounded-xl text-blue-300 text-xs focus:outline-none hover:bg-blue-500/20 transition-all"
                  >
                    <option value="sucursal" className="bg-slate-800">Sucursal</option>
                    <option value="admin" className="bg-slate-800">Admin</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-white/60 mb-2">No se encontraron usuarios</p>
          <p className="text-white/40 text-sm">Ajusta los filtros o crea un nuevo usuario</p>
        </div>
      )}

      {/* Modal de crear usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white/95">Crear Nuevo Usuario</h3>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Método de creación */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">Método de creación</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateMethod('invite')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      createMethod === 'invite'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Email Automático
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMethod('direct')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      createMethod === 'direct'
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Creación Directa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMethod('invitation')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      createMethod === 'invitation'
                        ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Invitación Manual
                  </button>
                </div>
                <div className="text-xs text-white/50 mt-2 p-3 bg-white/5 rounded-lg">
                  {createMethod === 'invite' && (
                    <>
                      <strong className="text-blue-300">Email Automático:</strong> El usuario recibe un email automático para completar registro. Requiere Service Key.
                    </>
                  )}
                  {createMethod === 'direct' && (
                    <>
                      <strong className="text-green-300">Creación Directa:</strong> Usuario creado inmediatamente con contraseña. Requiere Service Key.
                    </>
                  )}
                  {createMethod === 'invitation' && (
                    <>
                      <strong className="text-red-300">Invitación Manual:</strong> Crea invitación, usuario se registra normalmente. No requiere Service Key.
                    </>
                  )}
                </div>
                {!AuthService.isAdminConfigured() && (
                  <div className="text-xs text-yellow-300 mt-2 p-2 bg-yellow-500/10 border border-yellow-400/20 rounded-lg">
                    ⚠️ Service Key no configurada. Solo funciona "Invitación Manual".
                  </div>
                )}
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    placeholder="Juan Pérez García"
                    required
                  />
                </div>

                {createMethod === 'direct' && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Contraseña *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50"
                      placeholder="Mínimo 6 caracteres"
                      required={createMethod === 'direct'}
                      minLength={6}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    required
                  >
                    <option value="sucursal" className="bg-slate-800">Usuario Sucursal</option>
                    <option value="admin" className="bg-slate-800">Administrador</option>
                  </select>
                </div>

                {formData.role === 'sucursal' && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Sucursal *</label>
                    <select
                      value={formData.idSucursal}
                      onChange={(e) => setFormData({...formData, idSucursal: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
                      required={formData.role === 'sucursal'}
                    >
                      <option value="" className="bg-slate-800">Seleccionar sucursal...</option>
                      {sucursales.map((sucursal) => (
                        <option key={sucursal.id_sucursal} value={sucursal.id_sucursal} className="bg-slate-800">
                          {sucursal.Sucursal} - {sucursal.Región}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Procesando...' : (
                      createMethod === 'invite' ? 'Enviar Email' :
                      createMethod === 'direct' ? 'Crear Usuario' :
                      'Crear Invitación'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambiar sucursal */}
      {showSucursalModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white/95">Cambiar Sucursal</h3>
                <button
                  onClick={() => { setShowSucursalModal(false); setSelectedUser(null); setEditSucursalData({ idSucursal: '' }); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información del usuario */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400/20 to-purple-600/20 border border-purple-400/30 rounded-xl flex items-center justify-center">
                    <span className="text-purple-300 font-semibold">
                      {selectedUser.full_name?.charAt(0)?.toUpperCase() || selectedUser.id.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white/90 font-medium">{selectedUser.full_name || 'Sin nombre'}</h4>
                    <p className="text-white/60 text-sm">Usuario de Sucursal</p>
                  </div>
                </div>
                
                {/* Sucursal actual */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Sucursal actual:</span>
                    {selectedUser.sucursales ? (
                      <span className="text-green-400 font-medium">{selectedUser.sucursales.Sucursal}</span>
                    ) : (
                      <span className="text-red-400">Sin asignar</span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangeSucursal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nueva Sucursal *</label>
                  <select
                    value={editSucursalData.idSucursal}
                    onChange={(e) => setEditSucursalData({ idSucursal: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    required
                  >
                    <option value="" className="bg-slate-800">Seleccionar nueva sucursal...</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id_sucursal} value={sucursal.id_sucursal} className="bg-slate-800">
                        {sucursal.Sucursal} - {sucursal.Región}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowSucursalModal(false); setSelectedUser(null); setEditSucursalData({ idSucursal: '' }); }}
                    className="flex-1 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white/80 hover:bg-white/20 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300 hover:bg-purple-500/30 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Actualizando...' : 'Cambiar Sucursal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}