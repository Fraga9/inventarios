import { useState, useEffect } from 'react';
import { BarcodeCard, Card, InventoryCard, ProductCountScreen, ErrorBoundary, Login, Register, AdminDashboard, ScanInventoryScreen, MovementHistoryScreen, CurrentInventoryScreen } from './components';
import { InventoryService } from './services/inventoryService';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function App() {
  const { isAuthenticated, user, profile, loading: authLoading, logout, isAdmin, sucursal } = useAuth();
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'scan', 'history', 'inventory', 'productCount', 'admin'
  const [scannedProduct, setScannedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalProductos: 0, totalUnidades: 0, precision: 100 });
  const [showRegister, setShowRegister] = useState(false);

  // Cargar datos iniciales cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && profile) {
      loadInitialData();
    }
  }, [isAuthenticated, profile]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Para admin: cargar datos de todas las sucursales o saltar si no hay sucursales asignadas
      if (isAdmin) {
        // Admin users might not have initial data or could see a global view
        setScannedItems([]);
        setStats({ totalProductos: 0, totalUnidades: 0, precision: 100 });
        return;
      }

      // Obtener ID de sucursal del usuario actual
      const idSucursal = profile?.id_sucursal;
      
      if (!idSucursal) {
        throw new Error('Usuario sin sucursal asignada');
      }

      const [movimientos, estadisticas] = await Promise.all([
        InventoryService.getRecentMovements(10, idSucursal),
        InventoryService.getInventoryStats(idSucursal)
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
      
      // Obtener ID de sucursal del usuario actual
      const idSucursal = profile?.id_sucursal;
      if (!idSucursal) {
        throw new Error('Usuario sin sucursal asignada');
      }

      // Registrar movimiento en la base de datos
      const result = await InventoryService.registerMovement({
        idProducto: scannedProduct.id_producto,
        cantidadNueva: count,
        tipoMovimiento: 'conteo',
        usuario: profile?.full_name || user?.email || 'Usuario',
        idSucursal: idSucursal,
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

  const handleLogin = (result) => {
    // Login is handled by AuthContext, just reset any local state
    setError(null);
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setScannedItems([]);
      setScannedProduct(null);
      setCurrentScreen('home');
      setError(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Error al cerrar sesión');
    }
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
    alert('Registro exitoso. Tu cuenta será revisada por un administrador. Recibirás un correo de confirmación.');
  };

  // Show loading while authentication is being initialized
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-3 border-red-400/30 rounded-full animate-spin">
            <div className="w-12 h-12 border-3 border-transparent border-t-red-400 rounded-full"></div>
          </div>
          <p className="text-white/90 font-medium">Iniciando aplicación...</p>
        </div>
      </div>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register 
          onBack={() => setShowRegister(false)}
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    }
    
    return (
      <Login 
        onLogin={handleLogin}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header mejorado siguiendo el design system */}
      <header className="relative overflow-hidden backdrop-blur-xl border-b border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08]">
        <div className="relative z-10 py-8 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-light text-white/95 tracking-wide text-center">
                <span className="font-semibold text-red-400">Promexma</span>
                <span className="mx-4 text-white/30">|</span>
                <span className="text-white/80 font-light">Control Interno</span>
              </h1>
            </div>
            
            {/* Navigation and user info */}
            <div className="flex items-center space-x-4">
              {/* Navigation */}
              <nav className="flex items-center space-x-1">
                {isAdmin && (
                  <button
                    onClick={() => setCurrentScreen('admin')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentScreen === 'admin' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Admin
                  </button>
                )}
                
                {/* Inventory Navigation */}
                <button
                  onClick={() => setCurrentScreen('home')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentScreen === 'home' 
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  Resumen
                </button>
                
                <button
                  onClick={() => setCurrentScreen('scan')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentScreen === 'scan' || currentScreen === 'productCount'
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  Escanear
                </button>
                
                <button
                  onClick={() => setCurrentScreen('history')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentScreen === 'history' 
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  Historial
                </button>
                
                <button
                  onClick={() => setCurrentScreen('inventory')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentScreen === 'inventory' 
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  Inventario
                </button>
              </nav>
              
              <div className="text-right">
                <p className="text-white/90 text-sm font-medium">{profile?.full_name}</p>
                <p className="text-white/60 text-xs">
                  {isAdmin ? 'Administrador' : sucursal?.Sucursal || 'Sin sucursal'}
                </p>
                {sucursal?.Región && !isAdmin && (
                  <p className="text-white/50 text-xs">{sucursal.Región}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
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
        {currentScreen === 'admin' && isAdmin ? (
          <div className="w-full max-w-7xl">
            <AdminDashboard />
          </div>
        ) : currentScreen === 'scan' ? (
          <ScanInventoryScreen onScanBarcode={handleBarcodeScanning} />
        ) : currentScreen === 'history' ? (
          <MovementHistoryScreen />
        ) : currentScreen === 'inventory' ? (
          <CurrentInventoryScreen />
        ) : currentScreen === 'productCount' ? (
          <div className="w-full max-w-3xl">
            <ProductCountScreen
              product={scannedProduct}
              onSaveCount={handleSaveCount}
              onBack={handleBack}
            />
          </div>
        ) : (
          <div className="w-full max-w-6xl space-y-12">
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

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Escanear Inventario Card */}
              <Card
                title="Escanear Inventario"
                description="Utiliza la cámara para escanear códigos de barras y realizar conteos"
                variant="primary"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                }
                buttonText="Comenzar Escaneo"
                onButtonClick={() => setCurrentScreen('scan')}
              />

              {/* Historial de Movimientos Card */}
              <Card
                title="Historial de Movimientos"
                description="Consulta el registro completo de todos los movimientos de inventario"
                variant="secondary"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                buttonText="Ver Historial"
                onButtonClick={() => setCurrentScreen('history')}
              />

              {/* Inventario Actual Card */}
              <Card
                title="Inventario Actual"
                description="Explora el inventario completo con herramientas de búsqueda y filtrado"
                variant="default"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5-1.5-15z" />
                  </svg>
                }
                buttonText="Ver Inventario"
                onButtonClick={() => setCurrentScreen('inventory')}
              />
            </div>

            {/* Recent Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Scans Summary */}
              <Card
                title="Actividad Reciente"
                variant="secondary"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                }
              >
                {scannedItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <h4 className="text-white/70 text-base font-medium mb-2">
                      Sin actividad reciente
                    </h4>
                    <p className="text-white/40 text-sm">
                      Comienza escaneando productos para ver la actividad aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {scannedItems.slice(0, 5).map((item, index) => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-xl bg-white/[0.06] border border-white/[0.12]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white/90 text-sm truncate">
                              {item.name}
                            </p>
                            <p className="text-white/40 text-xs">
                              {item.timestamp}
                            </p>
                          </div>
                          {item.count && (
                            <span className="px-2 py-1 bg-green-500/15 rounded-md text-xs font-medium text-green-300">
                              {item.count} uds.
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {scannedItems.length > 5 && (
                      <button
                        onClick={() => setCurrentScreen('history')}
                        className="w-full py-2 text-center text-white/60 text-sm hover:text-white/80 transition-colors"
                      >
                        Ver todos los movimientos →
                      </button>
                    )}
                  </div>
                )}
              </Card>

              {/* Quick Stats */}
              <Card
                title="Estadísticas de Inventario"
                variant="default"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-white/95">{stats.totalProductos}</div>
                    <div className="text-xs text-white/60">Productos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-white/95">{stats.totalUnidades}</div>
                    <div className="text-xs text-white/60">Unidades</div>
                  </div>
                  <div className="text-center col-span-2">
                    <div className="text-xl font-semibold text-green-400">{stats.precision}%</div>
                    <div className="text-xs text-white/60">Precisión</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;