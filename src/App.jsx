import { useState, useEffect } from 'react';
import { BarcodeCard, Card, ProductCountScreen, ErrorBoundary, InventoryCard } from './components';
import { InventoryService } from './services/inventoryService';
import './App.css';

function App() {
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalProductos: 0, totalUnidades: 0, precision: 100 });

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [movimientos, estadisticas] = await Promise.all([
        InventoryService.getRecentMovements(),
        InventoryService.getInventoryStats()
      ]);
      
      // Formatear movimientos para la UI
      const formattedItems = movimientos.map(mov => ({
        id: mov.id_movimiento,
        barcode: mov.productos.codigo_mrp || mov.productos.codigo_truper || 'N/A',
        name: mov.productos.descripcion || 'Producto sin descripción',
        category: mov.productos.marca || 'Sin marca',
        timestamp: new Date(mov.fecha_movimiento).toLocaleString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        count: mov.cantidad_nueva,
        lastCounted: new Date(mov.fecha_movimiento).toLocaleString('es-MX')
      }));
      
      setScannedItems(formattedItems);
      setStats(estadisticas);
      setError(null);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setError('Error al cargar datos del inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanning = async (scannedCode) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Código escaneado:', scannedCode);
      
      // Buscar el producto en la base de datos
      const producto = await InventoryService.findProductByBarcode(scannedCode);
      
      // Formatear producto para la UI
      const productData = InventoryService.formatProductForUI(producto, scannedCode);
      
      setScannedProduct(productData);
      setCurrentScreen('productCount');
      
    } catch (error) {
      console.error('Error al escanear código:', error);
      setError(`Error al buscar producto: ${error.message}`);
      
      // En caso de error, crear producto genérico
      const fallbackProduct = {
        id_producto: null,
        name: `Producto ${scannedCode.slice(-6)}`,
        category: 'No identificado',
        barcode: scannedCode,
        image: null
      };
      
      setScannedProduct(fallbackProduct);
      setCurrentScreen('productCount');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCount = async (barcode, count) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Guardando conteo para ${barcode}: ${count} unidades`);
      
      if (!scannedProduct?.id_producto) {
        throw new Error('No se puede guardar el conteo: producto no identificado en el sistema');
      }
      
      // Registrar movimiento en la base de datos
      const result = await InventoryService.registerMovement({
        idProducto: scannedProduct.id_producto,
        cantidadNueva: count,
        tipoMovimiento: 'conteo',
        observaciones: `Conteo desde aplicación móvil - Código: ${barcode}`
      });
      
      // Mostrar confirmación
      const productName = scannedProduct?.name || 'Producto';
      const diferencia = result.diferencia;
      const diferenciaTxt = diferencia > 0 ? `+${diferencia}` : diferencia.toString();
      
      alert(`✅ Conteo guardado exitosamente:\n\n${productName}\nCódigo: ${barcode}\nCantidad anterior: ${result.cantidadAnterior}\nCantidad nueva: ${count} unidades\nDiferencia: ${diferenciaTxt}`);
      
      // Recargar datos para actualizar la UI
      await loadInitialData();
      
      setCurrentScreen('home');
      setScannedProduct(null);
      
    } catch (error) {
      console.error('Error guardando conteo:', error);
      setError(`Error al guardar conteo: ${error.message}`);
      
      // En caso de error, permitir al usuario reintentar
      const retry = window.confirm(`Error al guardar el conteo: ${error.message}\n\n¿Deseas reintentar?`);
      if (retry) {
        await handleSaveCount(barcode, count);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setScannedProduct(null);
  };

  const getTotalProductsScanned = () => stats.totalProductos;
  const getTotalItemsCounted = () => stats.totalUnidades;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header mejorado siguiendo el design system */}
      <header className="relative overflow-hidden backdrop-blur-xl border-b border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08]">
        <div className="relative z-10 py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-light text-white/95 tracking-wide text-center">
              <span className="font-semibold text-red-400">Promexma</span>
              <span className="mx-4 text-white/30">|</span>
              <span className="text-white/80 font-light">Control Interno</span>
            </h1>
          </div>
        </div>
        
        {/* Efectos de fondo mejorados con colores corporativos */}
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-gradient-radial from-red-500/8 to-transparent rounded-full -translate-y-20"></div>
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-gradient-radial from-gray-500/10 to-transparent rounded-full -translate-y-16"></div>
        <div className="absolute bottom-0 center w-28 h-28 bg-gradient-radial from-white/5 to-transparent rounded-full translate-y-14"></div>
      </header>

      {/* Error global */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 bg-red-500/20 border border-red-400/30 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-red-200 text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-3 border-red-400/30 rounded-full animate-spin">
              <div className="w-12 h-12 border-3 border-transparent border-t-red-400 rounded-full"></div>
            </div>
            <p className="text-white/90 font-medium">Procesando...</p>
          </div>
        </div>
      )}

      {/* Contenido principal con mejor espaciado */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-16 px-6">
        {currentScreen === 'home' ? (
          <div className="w-full max-w-7xl space-y-12">
            {/* Título principal mejorado */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light text-white/95 mb-4 tracking-wide">
                Control de <span className="font-semibold text-red-400">Inventario</span>
              </h2>
              <p className="text-white/60 font-light text-lg max-w-2xl mx-auto leading-relaxed">
                Gestión inteligente y eficiente de productos con tecnología de escaneo avanzada
              </p>
              
              {/* Estadísticas rápidas mejoradas */}
              <div className="flex justify-center space-x-8 mt-8">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-white/95 mb-1">
                    {getTotalProductsScanned()}
                  </div>
                  <div className="text-xs text-white/50 font-light tracking-wide">
                    PRECISIÓN
                  </div>
                </div>
              </div>
            </div>

            {/* Layout principal con 3 cards en grid responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
              {/* Card de escaneo principal */}
              <div className="lg:col-span-1 xl:col-span-1 order-1">
                <div className="h-full min-h-[500px]">
                  <ErrorBoundary>
                    <BarcodeCard onScanBarcode={handleBarcodeScanning} />
                  </ErrorBoundary>
                </div>
              </div>

              {/* Historial de movimientos */}
              <div className="lg:col-span-1 xl:col-span-1 order-2">
                <div className="h-full min-h-[500px]">
                  <Card
                    title="Historial de Movimientos"
                    variant="secondary"
                    icon={
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    {scannedItems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                          <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                          </svg>
                        </div>
                        <h4 className="text-white/70 text-base font-medium mb-2">
                          Sin movimientos previos
                        </h4>
                        <p className="text-white/40 text-sm font-light leading-relaxed max-w-xs mx-auto">
                          Los movimientos recientes aparecerán aquí con información detallada
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                        {scannedItems.map((item, index) => (
                          <div 
                            key={item.id}
                            className={`
                              group p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm
                              transition-all duration-500 ease-out transform
                              hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]
                              hover:shadow-lg hover:shadow-black/10
                            `}
                            style={{ 
                              animationDelay: `${index * 150}ms`,
                              animation: 'slideInUp 0.6s ease-out forwards'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <p className="font-medium text-white/95 text-base group-hover:text-white transition-colors truncate">
                                    {item.name}
                                  </p>
                                  <span className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-lg text-xs font-medium text-blue-300 flex-shrink-0">
                                    {item.category}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 mb-2 flex-wrap">
                                  <span className="px-2 py-1 bg-gray-500/20 border border-gray-400/30 rounded-lg text-xs font-medium text-gray-300">
                                    {item.barcode}
                                  </span>
                                  {item.count && (
                                    <span className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded-lg text-xs font-medium text-green-300">
                                      {item.count} uds.
                                    </span>
                                  )}
                                </div>
                                <p className="text-white/40 text-xs font-light tracking-wide">
                                  Registrado: {item.timestamp}
                                </p>
                              </div>
                              <div className="flex flex-col items-center space-y-2 ml-4 flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                {item.count && (
                                  <div className="text-center">
                                    <div className="text-green-400 text-lg font-semibold">
                                      {item.count}
                                    </div>
                                    <div className="text-green-400/60 text-xs">
                                      unidades
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Nueva card de inventario actual */}
              <div className="lg:col-span-2 xl:col-span-1 order-3">
                <div className="h-full min-h-[500px]">
                  <ErrorBoundary>
                    <InventoryCard />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <ProductCountScreen
              product={scannedProduct}
              onSaveCount={handleSaveCount}
              onBack={handleBack}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;