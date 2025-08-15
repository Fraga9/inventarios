import { supabase, APP_CONFIG } from '../config/supabase.js';

/**
 * Servicio para gestionar operaciones de inventario con Supabase
 */
export class InventoryService {
  
  // Función helper para obtener el ID de sucursal efectivo
  // Esta función debe ser configurada desde el contexto de autenticación
  static getEffectiveSucursalId = null;

  /**
   * Configura la función para obtener el ID de sucursal efectivo
   * @param {Function} getEffectiveSucursalIdFn - Función que retorna el ID de sucursal
   */
  static setGetEffectiveSucursalId(getEffectiveSucursalIdFn) {
    this.getEffectiveSucursalId = getEffectiveSucursalIdFn;
  }

  /**
   * Obtiene el ID de sucursal a usar en las operaciones
   * @param {number} explicitIdSucursal - ID de sucursal explícito (opcional)
   * @returns {number} - ID de sucursal a usar
   */
  static getSucursalId(explicitIdSucursal) {
    if (explicitIdSucursal) {
      return explicitIdSucursal;
    }
    
    if (this.getEffectiveSucursalId) {
      return this.getEffectiveSucursalId();
    }
    
    console.warn('No se ha configurado getEffectiveSucursalId ni se proporcionó ID explícito');
    return null;
  }
  

  /**
   * Diagnóstico completo de la conexión a Supabase
   * @returns {Promise<Object>} - Resultado del diagnóstico
   */
  static async diagnoseSupabaseConnection() {
    const diagnostics = {
      connection: false,
      tablesFound: [],
      productosCount: 0,
      sampleData: [],
      errors: []
    };

    try {
      console.log('🔍 Iniciando diagnóstico de Supabase...');
      
      // 1. Probar conexión básica con un query simple
      console.log('1️⃣ Probando conexión básica...');
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from('productos')
          .select('count', { count: 'exact', head: true });
        
        if (connectionError) {
          diagnostics.errors.push(`Conexión: ${connectionError.message}`);
          console.error('❌ Error de conexión:', connectionError);
        } else {
          diagnostics.connection = true;
          diagnostics.productosCount = connectionTest || 0;
          console.log('✅ Conexión exitosa');
        }
      } catch (connError) {
        diagnostics.errors.push(`Excepción de conexión: ${connError.message}`);
        console.error('❌ Excepción de conexión:', connError);
      }

      // 2. Intentar obtener información del esquema (si es posible)
      console.log('2️⃣ Verificando tablas disponibles...');
      try {
        // Intentar queries a diferentes tablas para ver cuáles existen
        const tables = ['productos', 'inventarios', 'movimientos', 'sucursales'];
        
        for (const table of tables) {
          try {
            const { error } = await supabase
              .from(table)
              .select('*')
              .limit(1);
            
            if (!error) {
              diagnostics.tablesFound.push(table);
              console.log(`✅ Tabla '${table}' encontrada`);
            }
          } catch (tableError) {
            console.log(`❌ Tabla '${table}' no accesible:`, tableError.message);
            diagnostics.errors.push(`Tabla ${table}: ${tableError.message}`);
          }
        }
      } catch (schemaError) {
        diagnostics.errors.push(`Schema: ${schemaError.message}`);
        console.error('❌ Error verificando esquema:', schemaError);
      }

      // 3. Si la tabla productos existe, intentar obtener datos
      if (diagnostics.tablesFound.includes('productos')) {
        console.log('3️⃣ Obteniendo datos de productos...');
        try {
          const { data, error, count } = await supabase
            .from('productos')
            .select('*', { count: 'exact' })
            .limit(5);

          if (error) {
            diagnostics.errors.push(`Datos productos: ${error.message}`);
            console.error('❌ Error obteniendo productos:', error);
          } else {
            diagnostics.sampleData = data || [];
            diagnostics.productosCount = count || 0;
            console.log(`✅ Encontrados ${count} productos, mostrando primeros ${data?.length || 0}`);
            console.log('📦 Datos de muestra:', data);
          }
        } catch (dataError) {
          diagnostics.errors.push(`Excepción datos: ${dataError.message}`);
          console.error('❌ Excepción obteniendo datos:', dataError);
        }
      }

      // 4. Verificar configuración de Supabase
      console.log('4️⃣ Verificando configuración...');
      const config = {
        url: supabase.supabaseUrl,
        hasKey: !!supabase.supabaseKey,
        keyLength: supabase.supabaseKey?.length || 0
      };
      console.log('🔧 Configuración Supabase:', config);

      return diagnostics;
      
    } catch (error) {
      console.error('❌ Error general en diagnóstico:', error);
      diagnostics.errors.push(`General: ${error.message}`);
      return diagnostics;
    }
  }

  /**
   * Obtener los primeros productos para testing
   * @param {number} limit - Límite de productos a obtener
   * @returns {Promise<Array>} - Lista de productos
   */
  static async getTestProducts(limit = 5) {
    try {
      console.log('Obteniendo productos de prueba...');
      
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log('Productos encontrados:', data);
      return data || [];
      
    } catch (error) {
      console.error('Error obteniendo productos de prueba:', error);
      throw new Error(`Error al obtener productos: ${error.message}`);
    }
  }

  /**
   * Buscar producto por código de barras
   * @param {string} barcode - Código de barras a buscar
   * @returns {Promise<Object|null>} - Producto encontrado o null
   */
  static async findProductByBarcode(barcode) {
    try {
      console.log('Buscando producto con código:', barcode);
      
      // Primero buscar por código Truper
      let { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo_truper', barcode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Si no se encuentra por código Truper, buscar por código MRP
      if (!data) {
        const result = await supabase
          .from('productos')
          .select('*')
          .eq('codigo_mrp', barcode)
          .maybeSingle();
        
        data = result.data;
        error = result.error;

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
      }

      if (!data) {
        console.log('Producto no encontrado:', barcode);
        return null;
      }

      console.log('Producto encontrado:', data);
      return data;
      
    } catch (error) {
      console.error('Error buscando producto:', error);
      throw new Error(`Error al buscar producto: ${error.message}`);
    }
  }

  /**
   * Obtener inventario actual de un producto en una sucursal
   * @param {number} idProducto - ID del producto
   * @param {number} idSucursal - ID de la sucursal (opcional, usa sucursal efectiva)
   * @returns {Promise<Object|null>} - Registro de inventario o null
   */
  static async getCurrentInventory(idProducto, idSucursal) {
    const efectiveIdSucursal = this.getSucursalId(idSucursal);
    
    if (!efectiveIdSucursal) {
      throw new Error('ID de sucursal es requerido');
    }
    
    try {
      const { data, error } = await supabase
        .from('inventarios')
        .select('*')
        .eq('id_producto', idProducto)
        .eq('id_sucursal', efectiveIdSucursal)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
      
    } catch (error) {
      console.error('Error obteniendo inventario:', error);
      throw new Error(`Error al obtener inventario: ${error.message}`);
    }
  }

  /**
   * Registrar un movimiento de inventario y actualizar el stock
   * @param {Object} movementData - Datos del movimiento
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async registerMovement(movementData) {
    try {
      const {
        idProducto,
        cantidadAgregada, // Cambio: ahora es cantidad a agregar, no cantidad nueva total
        tipoMovimiento = 'conteo',
        usuario,
        observaciones = null,
        idSucursal
      } = movementData;

      const efectiveIdSucursal = this.getSucursalId(idSucursal);
      
      if (!efectiveIdSucursal) {
        throw new Error('ID de sucursal es requerido');
      }
      
      if (!usuario) {
        throw new Error('Usuario es requerido');
      }

      if (cantidadAgregada < 0) {
        throw new Error('La cantidad agregada no puede ser negativa');
      }

      console.log('Registrando movimiento sumatorio:', movementData);

      // Obtener inventario actual
      const inventarioActual = await this.getCurrentInventory(idProducto, efectiveIdSucursal);
      const cantidadAnterior = inventarioActual ? inventarioActual.cantidad_actual : 0;
      
      // Calcular nueva cantidad total (conteo ciego sumatorio)
      const cantidadNuevaTotal = cantidadAnterior + cantidadAgregada;

      // Preparar datos del movimiento
      const movimiento = {
        id_sucursal: efectiveIdSucursal,
        id_producto: idProducto,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: cantidadNuevaTotal,
        tipo_movimiento: tipoMovimiento,
        usuario,
        observaciones: observaciones ? 
          `${observaciones} - Conteo sumatorio: +${cantidadAgregada} unidades` : 
          `Conteo sumatorio: +${cantidadAgregada} unidades`
      };

      // Iniciar transacción usando RPC si es necesario, o hacer operaciones secuenciales
      
      // 1. Insertar movimiento
      const { data: movimientoData, error: movimientoError } = await supabase
        .from('movimientos')
        .insert(movimiento)
        .select()
        .single();

      if (movimientoError) {
        throw movimientoError;
      }

      // 2. Actualizar o crear registro de inventario
      if (inventarioActual) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('inventarios')
          .update({ 
            cantidad_actual: cantidadNuevaTotal,
            ultimo_conteo: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id_inventario', inventarioActual.id_inventario);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Crear nuevo registro
        const { error: insertError } = await supabase
          .from('inventarios')
          .insert({
            id_sucursal: efectiveIdSucursal,
            id_producto: idProducto,
            cantidad_actual: cantidadNuevaTotal,
            ultimo_conteo: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log('Movimiento sumatorio registrado exitosamente:', movimientoData);
      
      return {
        success: true,
        movimiento: movimientoData,
        cantidadAnterior,
        cantidadAgregada,
        cantidadNuevaTotal,
        diferencia: cantidadAgregada // En conteo sumatorio, la diferencia es lo que se agregó
      };

    } catch (error) {
      console.error('Error registrando movimiento sumatorio:', error);
      throw new Error(`Error al registrar movimiento: ${error.message}`);
    }
  }

  /**
   * Resetear inventario de un producto a 0
   * @param {Object} resetData - Datos del reseteo
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async resetProductInventory(resetData) {
    try {
      const {
        idProducto,
        usuario,
        idSucursal,
        observaciones = 'Reseteo manual'
      } = resetData;

      const efectiveIdSucursal = this.getSucursalId(idSucursal);
      
      if (!efectiveIdSucursal) {
        throw new Error('ID de sucursal es requerido');
      }
      
      if (!usuario) {
        throw new Error('Usuario es requerido');
      }

      if (!idProducto) {
        throw new Error('ID de producto es requerido');
      }

      console.log('Reseteando inventario a 0:', resetData);

      // Obtener inventario actual
      const inventarioActual = await this.getCurrentInventory(idProducto, efectiveIdSucursal);
      const cantidadAnterior = inventarioActual ? inventarioActual.cantidad_actual : 0;

      // Preparar datos del movimiento de reseteo
      const movimiento = {
        id_sucursal: efectiveIdSucursal,
        id_producto: idProducto,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: 0,
        tipo_movimiento: 'ajuste',
        usuario,
        observaciones: `${observaciones} - Inventario reseteado de ${cantidadAnterior} a 0 unidades`
      };

      // 1. Insertar movimiento de reseteo
      const { data: movimientoData, error: movimientoError } = await supabase
        .from('movimientos')
        .insert(movimiento)
        .select()
        .single();

      if (movimientoError) {
        throw movimientoError;
      }

      // 2. Actualizar o crear registro de inventario con cantidad 0
      if (inventarioActual) {
        // Actualizar registro existente a 0
        const { error: updateError } = await supabase
          .from('inventarios')
          .update({ 
            cantidad_actual: 0,
            ultimo_conteo: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id_inventario', inventarioActual.id_inventario);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Crear nuevo registro con cantidad 0
        const { error: insertError } = await supabase
          .from('inventarios')
          .insert({
            id_sucursal: efectiveIdSucursal,
            id_producto: idProducto,
            cantidad_actual: 0,
            ultimo_conteo: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log('Inventario reseteado exitosamente:', movimientoData);
      
      return {
        success: true,
        movimiento: movimientoData,
        cantidadAnterior,
        cantidadNueva: 0,
        diferencia: -cantidadAnterior
      };

    } catch (error) {
      console.error('Error reseteando inventario:', error);
      throw new Error(`Error al resetear inventario: ${error.message}`);
    }
  }

  /**
   * Obtener historial de movimientos recientes
   * @param {number} limit - Límite de registros
   * @param {number} idSucursal - ID de la sucursal (opcional, usa sucursal efectiva)
   * @returns {Promise<Array>} - Lista de movimientos
   */
  static async getRecentMovements(limit = APP_CONFIG.HISTORY_LIMIT, idSucursal) {
    const efectiveIdSucursal = this.getSucursalId(idSucursal);
    
    if (!efectiveIdSucursal) {
      throw new Error('ID de sucursal es requerido');
    }
    
    try {
      const { data, error } = await supabase
        .from('movimientos')
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
        .eq('id_sucursal', efectiveIdSucursal)
        .order('fecha_movimiento', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
      
    } catch (error) {
      console.error('Error obteniendo movimientos recientes:', error);
      throw new Error(`Error al obtener movimientos: ${error.message}`);
    }
  }

  /**
   * Obtener información completa de un producto para mostrar en la interfaz
   * @param {Object} producto - Producto de la base de datos
   * @param {string} barcode - Código de barras escaneado
   * @returns {Object} - Información formateada para la UI
   */
  static formatProductForUI(producto, barcode) {
    if (!producto) {
      return {
        id_producto: null,
        name: `Producto ${barcode.slice(-6)}`,
        category: 'No identificado',
        barcode: barcode,
        image: null,
        marca: null,
        descripcion: 'Producto no registrado en el sistema'
      };
    }

    return {
      id_producto: producto.id_producto,
      name: producto.descripcion || `${producto.marca || ''} - ${barcode.slice(-6)}`.trim(),
      category: producto.marca || 'Sin marca',
      barcode: barcode,
      image: null, // Por ahora no manejamos imágenes
      marca: producto.marca,
      descripcion: producto.descripcion,
      codigo_mrp: producto.codigo_mrp,
      codigo_truper: producto.codigo_truper
    };
  }

  /**
   * Obtener estadísticas básicas del inventario
   * @param {number} idSucursal - ID de la sucursal (opcional, usa sucursal efectiva)
   * @returns {Promise<Object>} - Estadísticas
   */
  static async getInventoryStats(idSucursal) {
    const efectiveIdSucursal = this.getSucursalId(idSucursal);
    
    if (!efectiveIdSucursal) {
      throw new Error('ID de sucursal es requerido');
    }
    
    try {
      // Obtener conteo de productos únicos
      const { count: totalProductos, error: countError } = await supabase
        .from('inventarios')
        .select('id_producto', { count: 'exact' })
        .eq('id_sucursal', efectiveIdSucursal);

      if (countError) {
        throw countError;
      }

      // Obtener suma total de unidades
      const { data: sumData, error: sumError } = await supabase
        .from('inventarios')
        .select('cantidad_actual')
        .eq('id_sucursal', efectiveIdSucursal);

      if (sumError) {
        throw sumError;
      }

      const totalUnidades = sumData.reduce((sum, item) => sum + Number(item.cantidad_actual), 0);

      return {
        totalProductos: totalProductos || 0,
        totalUnidades: Math.round(totalUnidades),
        precision: 100 // Por ahora fijo, podrías calcular basado en diferencias
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalProductos: 0,
        totalUnidades: 0,
        precision: 100
      };
    }
  }

  /**
   * Guardar reporte mensual y resetear inventario de la sucursal
   * @param {Object} reportData - Datos del reporte
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async saveMonthlyReportAndReset(reportData) {
    try {
      const {
        sucursalId,
        reporteData,
        usuario,
        archivoUrl = null
      } = reportData;

      if (!sucursalId) {
        throw new Error('ID de sucursal es requerido');
      }
      
      if (!usuario) {
        throw new Error('Usuario es requerido');
      }

      if (!reporteData || reporteData.length === 0) {
        throw new Error('Datos del reporte son requeridos');
      }

      console.log('🔄 Iniciando guardado de reporte mensual y reseteo...');

      const ahora = new Date();
      const mes = ahora.getMonth() + 1; // JavaScript months are 0-indexed
      const año = ahora.getFullYear();

      // 1. Verificar si ya existe un reporte para este mes y año
      const { data: existingReport, error: checkError } = await supabase
        .from('reportes_mensuales')
        .select('id')
        .eq('sucursal_id', sucursalId)
        .eq('mes', mes)
        .eq('año', año)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingReport) {
        throw new Error(`Ya existe un reporte para ${mes}/${año}. No se puede crear otro reporte para el mismo período.`);
      }

      // 2. Crear registro del reporte mensual
      const reporteRecord = {
        mes,
        año,
        sucursal_id: sucursalId,
        archivo_url: archivoUrl,
        datos_reporte: reporteData, // Guardar los datos del reporte como JSON
        usuario_creacion: usuario,
        total_productos: reporteData.length,
        total_diferencias: reporteData.reduce((sum, item) => sum + Math.abs(item.difference), 0)
      };

      const { data: savedReport, error: saveError } = await supabase
        .from('reportes_mensuales')
        .insert(reporteRecord)
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      console.log('✅ Reporte mensual guardado:', savedReport);

      // 3. Obtener todos los productos del inventario de la sucursal
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventarios')
        .select('id_inventario, id_producto, cantidad_actual')
        .eq('id_sucursal', sucursalId);

      if (inventoryError) {
        throw inventoryError;
      }

      console.log(`🔄 Preparando reseteo de ${inventoryItems?.length || 0} productos...`);

      // 4. Crear movimientos de reseteo para cada producto con inventario > 0
      const movimientosReset = [];
      const productosParaReset = inventoryItems?.filter(item => item.cantidad_actual > 0) || [];

      for (const item of productosParaReset) {
        movimientosReset.push({
          id_sucursal: sucursalId,
          id_producto: item.id_producto,
          cantidad_anterior: item.cantidad_actual,
          cantidad_nueva: 0,
          tipo_movimiento: 'ajuste',
          usuario: usuario,
          observaciones: `Reseteo mensual - Reporte ${mes}/${año} - ID: ${savedReport.id}`
        });
      }

      // 5. Insertar movimientos de reseteo en lotes
      if (movimientosReset.length > 0) {
        const { error: movimientosError } = await supabase
          .from('movimientos')
          .insert(movimientosReset);

        if (movimientosError) {
          throw movimientosError;
        }

        console.log(`✅ ${movimientosReset.length} movimientos de reseteo registrados`);
      }

      // 6. Resetear todas las cantidades a 0
      const { error: resetError } = await supabase
        .from('inventarios')
        .update({ 
          cantidad_actual: 0,
          ultimo_conteo: ahora.toISOString(),
          fecha_actualizacion: ahora.toISOString()
        })
        .eq('id_sucursal', sucursalId);

      if (resetError) {
        throw resetError;
      }

      console.log('✅ Inventario reseteado completamente');

      return {
        success: true,
        reporte: savedReport,
        productosReseteados: productosParaReset.length,
        movimientosCreados: movimientosReset.length,
        mes,
        año
      };

    } catch (error) {
      console.error('❌ Error guardando reporte mensual y reseteando:', error);
      throw new Error(`Error al guardar reporte mensual: ${error.message}`);
    }
  }

  /**
   * Obtener historial de reportes mensuales de una sucursal
   * @param {number} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} - Lista de reportes mensuales
   */
  static async getMonthlyReports(sucursalId) {
    try {
      if (!sucursalId) {
        throw new Error('ID de sucursal es requerido');
      }

      const { data, error } = await supabase
        .from('reportes_mensuales')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .order('año', { ascending: false })
        .order('mes', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`📊 Reportes mensuales encontrados: ${data?.length || 0}`);
      return data || [];

    } catch (error) {
      console.error('Error obteniendo reportes mensuales:', error);
      throw new Error(`Error al obtener reportes mensuales: ${error.message}`);
    }
  }

  /**
   * Obtener todos los reportes mensuales (para administradores)
   * @returns {Promise<Array>} - Lista de todos los reportes mensuales
   */
  static async getAllMonthlyReports() {
    try {
      const { data, error } = await supabase
        .from('reportes_mensuales')
        .select(`
          *,
          sucursales (
            Sucursal
          )
        `)
        .order('año', { ascending: false })
        .order('mes', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`📊 Todos los reportes mensuales encontrados: ${data?.length || 0}`);
      return data || [];

    } catch (error) {
      console.error('Error obteniendo todos los reportes mensuales:', error);
      throw new Error(`Error al obtener reportes mensuales: ${error.message}`);
    }
  }

  /**
   * Obtener datos detallados de un reporte mensual específico
   * @param {number} reporteId - ID del reporte
   * @returns {Promise<Object>} - Datos del reporte
   */
  static async getMonthlyReportDetails(reporteId) {
    try {
      if (!reporteId) {
        throw new Error('ID de reporte es requerido');
      }

      const { data, error } = await supabase
        .from('reportes_mensuales')
        .select(`
          *,
          sucursales (
            Sucursal
          )
        `)
        .eq('id', reporteId)
        .single();

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error obteniendo detalles del reporte:', error);
      throw new Error(`Error al obtener detalles del reporte: ${error.message}`);
    }
  }

}