import { supabase } from '../config/supabase.js';

/**
 * Servicio para operaciones de administración de sucursales y métricas avanzadas
 */
export class AdminService {

  /**
   * Obtener todas las sucursales con métricas completas
   * @returns {Promise<Array>} - Lista de sucursales con estadísticas
   */
  static async getSucursalesWithMetrics() {
    try {
      console.log('Obteniendo sucursales con métricas...');

      // Obtener sucursales base
      const { data: sucursales, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('*')
        .order('Sucursal');

      if (sucursalesError) throw sucursalesError;

      // Obtener métricas para cada sucursal en paralelo
      const sucursalesConMetricas = await Promise.all(
        sucursales.map(async (sucursal) => {
          try {
            // Estadísticas de inventario
            const { data: inventarioStats, error: inventarioError } = await supabase
              .from('inventarios')
              .select('cantidad_actual')
              .eq('id_sucursal', sucursal.id_sucursal);

            if (inventarioError) throw inventarioError;

            const totalProductos = inventarioStats.length;
            const totalUnidades = inventarioStats.reduce((sum, item) => sum + (item.cantidad_actual || 0), 0);
            const productosConStock = inventarioStats.filter(item => item.cantidad_actual > 0).length;
            const productosBajoStock = inventarioStats.filter(item => item.cantidad_actual > 0 && item.cantidad_actual <= 5).length;

            // Usuarios asignados
            const { count: usuariosAsignados, error: usuariosError } = await supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('id_sucursal', sucursal.id_sucursal)
              .eq('is_active', true);

            if (usuariosError) console.warn(`Error contando usuarios para sucursal ${sucursal.id_sucursal}:`, usuariosError);

            // Último conteo
            const { data: ultimoMovimiento, error: movimientoError } = await supabase
              .from('movimientos')
              .select('fecha_movimiento')
              .eq('id_sucursal', sucursal.id_sucursal)
              .order('fecha_movimiento', { ascending: false })
              .limit(1);

            if (movimientoError) console.warn(`Error obteniendo último movimiento:`, movimientoError);

            // Movimientos del mes
            const inicioMes = new Date();
            inicioMes.setDate(1);
            inicioMes.setHours(0, 0, 0, 0);

            const { count: movimientosMes, error: movimientosMesError } = await supabase
              .from('movimientos')
              .select('*', { count: 'exact', head: true })
              .eq('id_sucursal', sucursal.id_sucursal)
              .gte('fecha_movimiento', inicioMes.toISOString());

            if (movimientosMesError) console.warn(`Error contando movimientos del mes:`, movimientosMesError);

            return {
              ...sucursal,
              metricas: {
                totalProductos,
                totalUnidades,
                productosConStock,
                productosBajoStock,
                usuariosAsignados: usuariosAsignados || 0,
                ultimoConteo: ultimoMovimiento?.[0]?.fecha_movimiento || null,
                movimientosMes: movimientosMes || 0,
                porcentajeStock: totalProductos > 0 ? Math.round((productosConStock / totalProductos) * 100) : 0
              }
            };
          } catch (error) {
            console.error(`Error calculando métricas para sucursal ${sucursal.id_sucursal}:`, error);
            return {
              ...sucursal,
              metricas: {
                totalProductos: 0,
                totalUnidades: 0,
                productosConStock: 0,
                productosBajoStock: 0,
                usuariosAsignados: 0,
                ultimoConteo: null,
                movimientosMes: 0,
                porcentajeStock: 0
              }
            };
          }
        })
      );

      console.log('Sucursales con métricas obtenidas:', sucursalesConMetricas.length);
      return sucursalesConMetricas;

    } catch (error) {
      console.error('Error obteniendo sucursales con métricas:', error);
      throw new Error(`Error al obtener sucursales: ${error.message}`);
    }
  }

  /**
   * Crear nueva sucursal
   * @param {Object} sucursalData - Datos de la nueva sucursal
   * @returns {Promise<Object>} - Sucursal creada
   */
  static async createSucursal(sucursalData) {
    try {
      const {
        nombre,
        region,
        direccion
      } = sucursalData;

      if (!nombre || !region) {
        throw new Error('Nombre y región son requeridos');
      }

      console.log('Creando nueva sucursal:', sucursalData);

      const { data, error } = await supabase
        .from('sucursales')
        .insert([{
          Sucursal: nombre,
          Región: region,
          Dirección: direccion || ''
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('Sucursal creada exitosamente:', data);
      return data;

    } catch (error) {
      console.error('Error creando sucursal:', error);
      throw new Error(`Error al crear sucursal: ${error.message}`);
    }
  }

  /**
   * Actualizar información de sucursal
   * @param {number} idSucursal - ID de la sucursal
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} - Sucursal actualizada
   */
  static async updateSucursal(idSucursal, updates) {
    try {
      if (!idSucursal) {
        throw new Error('ID de sucursal es requerido');
      }

      console.log('Actualizando sucursal:', { idSucursal, updates });

      // Mapear campos de la UI a la base de datos
      const dbUpdates = {};
      if (updates.nombre !== undefined) dbUpdates.Sucursal = updates.nombre;
      if (updates.region !== undefined) dbUpdates.Región = updates.region;
      if (updates.direccion !== undefined) dbUpdates.Dirección = updates.direccion;

      const { data, error } = await supabase
        .from('sucursales')
        .update(dbUpdates)
        .eq('id_sucursal', idSucursal)
        .select()
        .single();

      if (error) throw error;

      console.log('Sucursal actualizada exitosamente:', data);
      return data;

    } catch (error) {
      console.error('Error actualizando sucursal:', error);
      throw new Error(`Error al actualizar sucursal: ${error.message}`);
    }
  }

  /**
   * Eliminar sucursal (con validaciones de seguridad)
   * @param {number} idSucursal - ID de la sucursal
   * @returns {Promise<boolean>} - True si se eliminó exitosamente
   */
  static async deleteSucursal(idSucursal) {
    try {
      if (!idSucursal) {
        throw new Error('ID de sucursal es requerido');
      }

      console.log('Verificando si sucursal se puede eliminar:', idSucursal);

      // Verificar que no tenga usuarios asignados
      const { count: usuariosCount, error: usuariosError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('id_sucursal', idSucursal);

      if (usuariosError) throw usuariosError;

      if (usuariosCount > 0) {
        throw new Error('No se puede eliminar una sucursal con usuarios asignados. Reasigna los usuarios primero.');
      }

      // Verificar que no tenga inventario
      const { count: inventarioCount, error: inventarioError } = await supabase
        .from('inventarios')
        .select('*', { count: 'exact', head: true })
        .eq('id_sucursal', idSucursal);

      if (inventarioError) throw inventarioError;

      if (inventarioCount > 0) {
        throw new Error('No se puede eliminar una sucursal con registros de inventario. Transfiere o limpia los datos primero.');
      }

      // Verificar que no tenga movimientos
      const { count: movimientosCount, error: movimientosError } = await supabase
        .from('movimientos')
        .select('*', { count: 'exact', head: true })
        .eq('id_sucursal', idSucursal);

      if (movimientosError) throw movimientosError;

      if (movimientosCount > 0) {
        throw new Error('No se puede eliminar una sucursal con historial de movimientos. Los datos deben preservarse por auditoría.');
      }

      // Si todas las validaciones pasan, eliminar
      const { error: deleteError } = await supabase
        .from('sucursales')
        .delete()
        .eq('id_sucursal', idSucursal);

      if (deleteError) throw deleteError;

      console.log('Sucursal eliminada exitosamente:', idSucursal);
      return true;

    } catch (error) {
      console.error('Error eliminando sucursal:', error);
      throw new Error(`Error al eliminar sucursal: ${error.message}`);
    }
  }

  /**
   * Obtener métricas globales de administración
   * @returns {Promise<Object>} - Métricas globales
   */
  static async getGlobalMetrics() {
    try {
      console.log('Obteniendo métricas globales...');

      // Estadísticas de sucursales (todas las sucursales están "activas" por defecto)
      const { count: totalSucursales, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true });

      if (sucursalesError) throw sucursalesError;

      // Todas las sucursales se consideran activas ya que no hay campo 'activa'
      const sucursalesActivas = totalSucursales;

      // Estadísticas de usuarios
      const { count: totalUsuarios, error: usuariosError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usuariosError) throw usuariosError;

      const { count: usuariosActivos, error: usuariosActivosError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (usuariosActivosError) throw usuariosActivosError;

      // Estadísticas de inventario global
      const { data: inventarioGlobal, error: inventarioError } = await supabase
        .from('inventarios')
        .select('cantidad_actual');

      if (inventarioError) throw inventarioError;

      const totalProductosGlobal = inventarioGlobal.length;
      const totalUnidadesGlobal = inventarioGlobal.reduce((sum, item) => sum + (item.cantidad_actual || 0), 0);

      // Movimientos del mes actual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: movimientosEsteMes, error: movimientosError } = await supabase
        .from('movimientos')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_movimiento', inicioMes.toISOString());

      if (movimientosError) throw movimientosError;

      return {
        sucursales: {
          total: totalSucursales || 0,
          activas: sucursalesActivas || 0,
          inactivas: 0 // No hay campo activa, todas se consideran activas
        },
        usuarios: {
          total: totalUsuarios || 0,
          activos: usuariosActivos || 0,
          inactivos: (totalUsuarios || 0) - (usuariosActivos || 0)
        },
        inventario: {
          totalProductos: totalProductosGlobal,
          totalUnidades: totalUnidadesGlobal,
          promedioUnidadesPorProducto: totalProductosGlobal > 0 ? Math.round(totalUnidadesGlobal / totalProductosGlobal) : 0
        },
        actividad: {
          movimientosEsteMes: movimientosEsteMes || 0
        }
      };

    } catch (error) {
      console.error('Error obteniendo métricas globales:', error);
      throw new Error(`Error al obtener métricas: ${error.message}`);
    }
  }

  /**
   * Obtener usuarios sin sucursal asignada
   * @returns {Promise<Array>} - Lista de usuarios sin asignar
   */
  static async getUsersWithoutSucursal() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, created_at')
        .is('id_sucursal', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error obteniendo usuarios sin sucursal:', error);
      throw new Error(`Error al obtener usuarios: ${error.message}`);
    }
  }
}