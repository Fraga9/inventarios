import { useState, useEffect } from 'react';
import Card from '../Card/Card';
import { AuthService } from '../../services/authService';
import { InventoryService } from '../../services/inventoryService';

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSucursal, setSelectedSucursal] = useState('all');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, sucursalesData] = await Promise.all([
        AuthService.getAllUsers(),
        AuthService.getSucursales()
      ]);

      setUsers(usersData);
      setSucursales(sucursalesData);

      // Load stats for each sucursal
      const statsPromises = sucursalesData.map(async (sucursal) => {
        try {
          const sucursalStats = await InventoryService.getInventoryStats(sucursal.id_sucursal);
          return { id_sucursal: sucursal.id_sucursal, ...sucursalStats };
        } catch (error) {
          console.error(`Error loading stats for sucursal ${sucursal.id_sucursal}:`, error);
          return { id_sucursal: sucursal.id_sucursal, totalProductos: 0, totalUnidades: 0, precision: 0 };
        }
      });

      const allStats = await Promise.all(statsPromises);
      const statsMap = {};
      allStats.forEach(stat => {
        statsMap[stat.id_sucursal] = stat;
      });

      setStats(statsMap);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserRoleUpdate = async (userId, newRole, newSucursal) => {
    try {
      await AuthService.updateUserRole(userId, newRole, newSucursal);
      await loadAdminData(); // Reload data
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error al actualizar usuario: ${error.message}`);
    }
  };

  const getTotalStats = () => {
    const totals = Object.values(stats).reduce(
      (acc, stat) => ({
        totalProductos: acc.totalProductos + (stat.totalProductos || 0),
        totalUnidades: acc.totalUnidades + (stat.totalUnidades || 0)
      }),
      { totalProductos: 0, totalUnidades: 0 }
    );

    const avgPrecision = Object.values(stats).length > 0 
      ? Object.values(stats).reduce((acc, stat) => acc + (stat.precision || 0), 0) / Object.values(stats).length
      : 0;

    return { ...totals, precision: Math.round(avgPrecision) };
  };

  const getFilteredStats = () => {
    if (selectedSucursal === 'all') {
      return getTotalStats();
    }
    return stats[selectedSucursal] || { totalProductos: 0, totalUnidades: 0, precision: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-3 border-red-400/30 rounded-full animate-spin">
            <div className="w-12 h-12 border-3 border-transparent border-t-red-400 rounded-full"></div>
          </div>
          <p className="text-white/90 font-medium">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  const filteredStats = getFilteredStats();

  return (
    <div className="space-y-8">
      {/* Header with sucursal filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-white/95">
          Panel de <span className="font-semibold text-red-400">Administración</span>
        </h2>
        
        <select
          value={selectedSucursal}
          onChange={(e) => setSelectedSucursal(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          <option value="all" className="bg-slate-800">Todas las Sucursales</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id_sucursal} value={sucursal.id_sucursal} className="bg-slate-800">
              {sucursal.Sucursal} - {sucursal.Región}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Productos Escaneados" variant="default">
          <div className="text-center py-4">
            <div className="text-3xl font-semibold text-white/95 mb-2">
              {filteredStats.totalProductos}
            </div>
            <div className="text-white/60 text-sm">productos únicos</div>
          </div>
        </Card>

        <Card title="Unidades Contadas" variant="primary">
          <div className="text-center py-4">
            <div className="text-3xl font-semibold text-red-400 mb-2">
              {filteredStats.totalUnidades}
            </div>
            <div className="text-white/60 text-sm">unidades totales</div>
          </div>
        </Card>

        <Card title="Precisión Promedio" variant="secondary">
          <div className="text-center py-4">
            <div className="text-3xl font-semibold text-green-400 mb-2">
              {filteredStats.precision}%
            </div>
            <div className="text-white/60 text-sm">precisión del sistema</div>
          </div>
        </Card>
      </div>

      {/* Sucursales Stats */}
      <Card title="Estadísticas por Sucursal" variant="secondary">
        <div className="space-y-4">
          {sucursales.map((sucursal) => {
            const sucursalStats = stats[sucursal.id_sucursal] || { totalProductos: 0, totalUnidades: 0, precision: 0 };
            return (
              <div key={sucursal.id_sucursal} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="text-white/90 font-medium">{sucursal.Sucursal}</h4>
                  <p className="text-white/60 text-sm">{sucursal.Región}</p>
                </div>
                <div className="flex items-center space-x-6 text-center">
                  <div>
                    <div className="text-white/90 font-semibold">{sucursalStats.totalProductos}</div>
                    <div className="text-white/50 text-xs">productos</div>
                  </div>
                  <div>
                    <div className="text-red-400 font-semibold">{sucursalStats.totalUnidades}</div>
                    <div className="text-white/50 text-xs">unidades</div>
                  </div>
                  <div>
                    <div className="text-green-400 font-semibold">{sucursalStats.precision}%</div>
                    <div className="text-white/50 text-xs">precisión</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Users Management */}
      <Card title="Gestión de Usuarios" variant="primary">
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl">
              <div className="flex-1">
                <h4 className="text-white/90 font-medium">{user.full_name}</h4>
                <p className="text-white/60 text-sm">{user.id.slice(0, 8)}... • {user.created_at.split('T')[0]}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                  }`}>
                    {user.role === 'admin' ? 'Administrador' : 'Sucursal'}
                  </div>
                  {user.sucursales && (
                    <div className="text-white/60 text-xs mt-1">
                      {user.sucursales.Sucursal}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    defaultValue={user.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const newSucursal = newRole === 'admin' ? null : user.id_sucursal;
                      if (window.confirm(`¿Cambiar rol de ${user.full_name} a ${newRole}?`)) {
                        handleUserRoleUpdate(user.id, newRole, newSucursal);
                      }
                    }}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none"
                  >
                    <option value="sucursal" className="bg-slate-800">Sucursal</option>
                    <option value="admin" className="bg-slate-800">Admin</option>
                  </select>
                  
                  <div className={`w-3 h-3 rounded-full ${
                    user.is_active ? 'bg-green-400' : 'bg-red-400'
                  }`} title={user.is_active ? 'Activo' : 'Inactivo'}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}