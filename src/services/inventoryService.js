import { supabase, APP_CONFIG } from '../config/supabase.js';

/**
 * Servicio para gestionar operaciones de inventario con Supabase
 */
export class InventoryService {
  
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
   * @param {number} idSucursal - ID de la sucursal (opcional, usa default)
   * @returns {Promise<Object|null>} - Registro de inventario o null
   */
  static async getCurrentInventory(idProducto, idSucursal = APP_CONFIG.DEFAULT_SUCURSAL_ID) {
    try {
      const { data, error } = await supabase
        .from('inventarios')
        .select('*')
        .eq('id_producto', idProducto)
        .eq('id_sucursal', idSucursal)
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
        cantidadNueva,
        tipoMovimiento = 'conteo',
        usuario = APP_CONFIG.DEFAULT_USER,
        observaciones = null,
        idSucursal = APP_CONFIG.DEFAULT_SUCURSAL_ID
      } = movementData;

      console.log('Registrando movimiento:', movementData);

      // Obtener inventario actual
      const inventarioActual = await this.getCurrentInventory(idProducto, idSucursal);
      const cantidadAnterior = inventarioActual ? inventarioActual.cantidad_actual : 0;

      // Preparar datos del movimiento
      const movimiento = {
        id_sucursal: idSucursal,
        id_producto: idProducto,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: cantidadNueva,
        tipo_movimiento: tipoMovimiento,
        usuario,
        observaciones
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
            cantidad_actual: cantidadNueva,
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
            id_sucursal: idSucursal,
            id_producto: idProducto,
            cantidad_actual: cantidadNueva,
            ultimo_conteo: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log('Movimiento registrado exitosamente:', movimientoData);
      
      return {
        success: true,
        movimiento: movimientoData,
        cantidadAnterior,
        cantidadNueva,
        diferencia: cantidadNueva - cantidadAnterior
      };

    } catch (error) {
      console.error('Error registrando movimiento:', error);
      throw new Error(`Error al registrar movimiento: ${error.message}`);
    }
  }

  /**
   * Obtener historial de movimientos recientes
   * @param {number} limit - Límite de registros
   * @param {number} idSucursal - ID de la sucursal
   * @returns {Promise<Array>} - Lista de movimientos
   */
  static async getRecentMovements(limit = APP_CONFIG.HISTORY_LIMIT, idSucursal = APP_CONFIG.DEFAULT_SUCURSAL_ID) {
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
        .eq('id_sucursal', idSucursal)
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
   * @param {number} idSucursal - ID de la sucursal
   * @returns {Promise<Object>} - Estadísticas
   */
  static async getInventoryStats(idSucursal = APP_CONFIG.DEFAULT_SUCURSAL_ID) {
    try {
      // Obtener conteo de productos únicos
      const { count: totalProductos, error: countError } = await supabase
        .from('inventarios')
        .select('id_producto', { count: 'exact' })
        .eq('id_sucursal', idSucursal);

      if (countError) {
        throw countError;
      }

      // Obtener suma total de unidades
      const { data: sumData, error: sumError } = await supabase
        .from('inventarios')
        .select('cantidad_actual')
        .eq('id_sucursal', idSucursal);

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
}