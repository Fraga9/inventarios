import { useState, useEffect } from 'react';
import Card from '../Card/Card';
import { AuthService } from '../../services/authService';
import { InventoryService } from '../../services/inventoryService';
import { AdminService } from '../../services/adminService';
import { SucursalesManagement } from './SucursalesManagement';
import { UserManagement } from './UserManagement';
import { useAuth } from '../../contexts/AuthContext';

export function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [stats, setStats] = useState({});
  const [globalMetrics, setGlobalMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSucursal, setSelectedSucursal] = useState('all');
  const [currentTab, setCurrentTab] = useState('overview'); // overview, sucursales, users

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, sucursalesData, globalMetricsData] = await Promise.all([
        AuthService.getAllUsers(),
        AuthService.getSucursales(),
        AdminService.getGlobalMetrics()
      ]);

      setUsers(usersData);
      setSucursales(sucursalesData);
      setGlobalMetrics(globalMetricsData);

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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-white/80 text-lg mb-2">Acceso Restringido</p>
          <p className="text-white/60">No tienes permisos de administrador para acceder a esta sección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with navigation tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-white/95">
            Panel de <span className="font-semibold text-red-400">Administración</span>
          </h2>
          <p className="text-white/60 text-sm mt-1">Gestiona sucursales, usuarios y métricas del sistema</p>
        </div>
        
        {/* Navigation tabs */}
        <div className="flex items-center space-x-1 bg-white/[0.03] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'overview'
                ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setCurrentTab('sucursales')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'sucursales'
                ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Sucursales
          </button>
          <button
            onClick={() => setCurrentTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'users'
                ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Usuarios
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Tab Content */}
      {currentTab === 'overview' && (
        <div className="space-y-8">
          {/* Filter for overview */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white/90">Resumen General</h3>
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

          {/* Global Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Sucursales" variant="default">
              <div className="text-center py-4">
                <div className="text-2xl font-semibold text-white/95 mb-1">
                  {globalMetrics.sucursales?.activas || 0}
                </div>
                <div className="text-white/60 text-sm">activas</div>
                <div className="text-white/40 text-xs mt-1">
                  de {globalMetrics.sucursales?.total || 0} totales
                </div>
              </div>
            </Card>

            <Card title="Usuarios" variant="primary">
              <div className="text-center py-4">
                <div className="text-2xl font-semibold text-red-400 mb-1">
                  {globalMetrics.usuarios?.activos || 0}
                </div>
                <div className="text-white/60 text-sm">activos</div>
                <div className="text-white/40 text-xs mt-1">
                  de {globalMetrics.usuarios?.total || 0} totales
                </div>
              </div>
            </Card>

            <Card title="Inventario" variant="secondary">
              <div className="text-center py-4">
                <div className="text-2xl font-semibold text-green-400 mb-1">
                  {globalMetrics.inventario?.totalProductos || 0}
                </div>
                <div className="text-white/60 text-sm">productos</div>
                <div className="text-white/40 text-xs mt-1">
                  {globalMetrics.inventario?.totalUnidades || 0} unidades
                </div>
              </div>
            </Card>

            <Card title="Actividad" variant="default">
              <div className="text-center py-4">
                <div className="text-2xl font-semibold text-blue-400 mb-1">
                  {globalMetrics.actividad?.movimientosEsteMes || 0}
                </div>
                <div className="text-white/60 text-sm">este mes</div>
                <div className="text-white/40 text-xs mt-1">movimientos</div>
              </div>
            </Card>
          </div>

          {/* Inventory Stats */}
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

          {/* Sucursales Summary */}
          <Card title="Resumen por Sucursal" variant="secondary">
            <div className="space-y-4">
              {sucursales.map((sucursal) => {
                const sucursalStats = stats[sucursal.id_sucursal] || { totalProductos: 0, totalUnidades: 0, precision: 0 };
                return (
                  <div key={sucursal.id_sucursal} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <div>
                        <h4 className="text-white/90 font-medium">{sucursal.Sucursal}</h4>
                        <p className="text-white/60 text-sm">{sucursal.Región}</p>
                      </div>
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
        </div>
      )}

      {/* Sucursales Management Tab */}
      {currentTab === 'sucursales' && (
        <SucursalesManagement />
      )}

      {/* Users Management Tab */}
      {currentTab === 'users' && (
        <UserManagement />
      )}
    </div>
  );
}