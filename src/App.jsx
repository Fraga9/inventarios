import { useState, useEffect } from 'react';
import { BarcodeCard, Card, InventoryCard, ProductCountScreen, ErrorBoundary, Login, Register, AdminDashboard, ScanInventoryScreen, MovementHistoryScreen, CurrentInventoryScreen, ExcelReportScreen } from './components';
import { InventoryService } from './services/inventoryService';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function App() {
  const { isAuthenticated, user, profile, loading: authLoading, logout, isAdmin, sucursal } = useAuth();
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('scan'); // 'scan', 'history', 'inventory', 'productCount', 'admin', 'reports'
  const [scannedProduct, setScannedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalProductos: 0, totalUnidades: 0, precision: 100 });
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      
      setCurrentScreen('scan');
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
    setCurrentScreen('scan');
    setScannedProduct(null);
  };

  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
    setMobileMenuOpen(false); // Close mobile menu when navigating
  };


  const handleLogin = (result) => {
    // Login is handled by AuthContext, just reset any local state
    setError(null);
    setCurrentScreen('scan');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setScannedItems([]);
      setScannedProduct(null);
      setCurrentScreen('scan');
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
      {/* Mobile-Responsive Header */}
      <header className="relative overflow-hidden backdrop-blur-xl border-b border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08]">
        <div className="relative z-10 py-4 md:py-8 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Header Layout */}
            <div className="flex items-center justify-between">
              {/* Logo/Title - Responsive */}
              <div className="flex-1">
                <h1 className="text-xl md:text-3xl font-light text-white/95 tracking-wide text-center md:text-center">
                  <span className="font-semibold text-red-400">Promexma</span>
                  <span className="mx-2 md:mx-4 text-white/30 hidden sm:inline">|</span>
                  <span className="text-white/80 font-light hidden sm:inline md:inline">Control Interno</span>
                </h1>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-4">
                {/* Navigation */}
                <nav className="flex items-center space-x-1">
                  {isAdmin && (
                    <button
                      onClick={() => navigateToScreen('admin')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        currentScreen === 'admin' 
                          ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      Admin
                    </button>
                  )}
                  
                  
                  <button
                    onClick={() => navigateToScreen('scan')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentScreen === 'scan' || currentScreen === 'productCount'
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Escanear
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('history')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentScreen === 'history' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Historial
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('inventory')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentScreen === 'inventory' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Inventario
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('reports')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentScreen === 'reports' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Reportes
                  </button>
                </nav>
                
                {/* User Info - Desktop */}
                <div className="text-right">
                  <p className="text-white/90 text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-white/60 text-xs">
                    {isAdmin ? 'Administrador' : sucursal?.Sucursal || 'Sin sucursal'}
                  </p>
                  {sucursal?.Región && !isAdmin && (
                    <p className="text-white/50 text-xs">{sucursal.Región}</p>
                  )}
                </div>
                
                {/* Logout Button - Desktop */}
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

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center space-x-2">
                {/* User Avatar - Mobile */}
                <div className="flex items-center">
                  <div className="text-right mr-2">
                    <p className="text-white/90 text-xs font-medium truncate max-w-20">{profile?.full_name?.split(' ')[0]}</p>
                    <p className="text-white/60 text-xs">
                      {isAdmin ? 'Admin' : (sucursal?.Sucursal?.substring(0, 8) + '...' || 'Sin sucursal')}
                    </p>
                  </div>
                </div>
                
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4">
                <nav className="flex flex-col space-y-2">
                  {isAdmin && (
                    <button
                      onClick={() => navigateToScreen('admin')}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        currentScreen === 'admin' 
                          ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Panel Admin</span>
                      </div>
                    </button>
                  )}
                  
                  
                  <button
                    onClick={() => navigateToScreen('scan')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      currentScreen === 'scan' || currentScreen === 'productCount'
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <span>Escanear Inventario</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('history')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      currentScreen === 'history' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Historial de Movimientos</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('inventory')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      currentScreen === 'inventory' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5-1.5-15z" />
                      </svg>
                      <span>Inventario Actual</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => navigateToScreen('reports')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      currentScreen === 'reports' 
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span>Reportes ERP</span>
                    </div>
                  </button>

                  {/* Logout Button - Mobile */}
                  <div className="pt-2 mt-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium bg-red-500/10 text-red-300 border border-red-400/20 hover:bg-red-500/20 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span>Cerrar Sesión</span>
                      </div>
                    </button>
                  </div>
                </nav>
              </div>
            )}
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
        ) : currentScreen === 'reports' ? (
          <div className="w-full max-w-7xl">
            <ExcelReportScreen />
          </div>
        ) : currentScreen === 'productCount' ? (
          <div className="w-full max-w-3xl">
            <ProductCountScreen
              product={scannedProduct}
              onSaveCount={handleSaveCount}
              onBack={handleBack}
            />
          </div>
        ) : (
          // Fallback to scan screen
          <ScanInventoryScreen onScanBarcode={handleBarcodeScanning} />
        )}
      </main>
    </div>
  );
}

export default App;