import { useState, useEffect } from 'react';
import { BarcodeCard, Card, ProductCountScreen } from './components';
import './App.css';

function App() {
  const [scannedItems, setScannedItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [scannedProduct, setScannedProduct] = useState(null);

  // Base de datos simulada de productos
  const productDatabase = {
    '123456789012': {
      name: 'Laptop Gaming ROG Strix',
      category: 'Electrónicos',
      price: '$25,999.00',
      image: 'https://cdn.thewirecutter.com/wp-content/media/2024/11/cheapgaminglaptops-2048px-7981.jpg',
    },
    '7898357410015': {
      name: 'Smartphone Galaxy S24',
      category: 'Telefonía',
      price: '$18,999.00',
      image: 'https://images.samsung.com/mx/smartphones/galaxy-s24-ultra/images/galaxy-s24-ultra-highlights-color-titanium-green-back-mo.jpg?imbypass=true',
    },
    '987654321098': {
      name: 'Tablet iPad Pro',
      category: 'Electrónicos',
      price: '$22,499.00',
      image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-13-select-wifi-spacegray-202405',
    },
    'ABC123DEF456': {
      name: 'Audífonos AirPods Pro',
      category: 'Audio',
      price: '$5,499.00',
      image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-2nd-gen-hero-select-202209',
    }
  };

  const handleBarcodeScanning = (scannedCode) => {
    console.log('Código escaneado:', scannedCode);
    
    // Buscar el producto en la base de datos
    let productData = productDatabase[scannedCode];
    
    // Si no se encuentra el producto, crear uno genérico
    if (!productData) {
      productData = {
        name: `Producto ${scannedCode.slice(-6)}`,
        category: 'General',
        price: 'Precio no disponible',
        image: null
      };
    }

    // Agregar el código de barras al producto
    productData.barcode = scannedCode;
    
    setScannedProduct(productData);
    setCurrentScreen('productCount');

    // Agregar al historial de escaneos
    const newItem = {
      id: Date.now(),
      barcode: scannedCode,
      name: productData.name,
      category: productData.category,
      timestamp: new Date().toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    setScannedItems(prevItems => [newItem, ...prevItems].slice(0, 10)); // Mantener solo los últimos 10
  };

  const handleSaveCount = (barcode, count) => {
    console.log(`Guardando conteo para ${barcode}: ${count} unidades`);
    
    // Aquí podrías hacer una llamada a tu API para guardar el conteo
    // await api.saveInventoryCount(barcode, count);
    
    // Mostrar confirmación
    const productName = scannedProduct?.name || 'Producto';
    alert(`✅ Conteo guardado exitosamente:\n\n${productName}\nCódigo: ${barcode}\nCantidad: ${count} unidades`);
    
    // Actualizar el item en el historial con el conteo
    setScannedItems(prevItems => 
      prevItems.map(item => 
        item.barcode === barcode 
          ? { ...item, count, lastCounted: new Date().toLocaleString('es-MX') }
          : item
      )
    );
    
    setCurrentScreen('home');
    setScannedProduct(null);
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setScannedProduct(null);
  };

  const getTotalProductsScanned = () => scannedItems.length;
  const getTotalItemsCounted = () => scannedItems.reduce((total, item) => total + (item.count || 0), 0);

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

      {/* Contenido principal con mejor espaciado */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-16 px-6">
        {currentScreen === 'home' ? (
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
                    PRODUCTOS ESCANEADOS
                  </div>
                </div>
                <div className="w-px h-12 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-400 mb-1">
                    {getTotalItemsCounted()}
                  </div>
                  <div className="text-xs text-white/50 font-light tracking-wide">
                    UNIDADES CONTADAS
                  </div>
                </div>
                <div className="w-px h-12 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-400 mb-1">
                    100%
                  </div>
                  <div className="text-xs text-white/50 font-light tracking-wide">
                    PRECISIÓN
                  </div>
                </div>
              </div>
            </div>

            {/* Layout mejorado de cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-16">
              {/* Card de escaneo principal */}
              <div className="xl:col-span-1 order-1 xl:order-1">
                <BarcodeCard onScanBarcode={handleBarcodeScanning} />
              </div>

              {/* Historial de escaneos mejorado */}
              <div className="xl:col-span-1 order-2 xl:order-2">
                <Card
                  title="Historial de Escaneos"
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
                        Sin escaneos previos
                      </h4>
                      <p className="text-white/40 text-sm font-light leading-relaxed max-w-xs mx-auto">
                        Los productos escaneados aparecerán aquí con información detallada del inventario
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
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="font-medium text-white/95 text-base group-hover:text-white transition-colors">
                                  {item.name}
                                </p>
                                <span className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-lg text-xs font-medium text-blue-300">
                                  {item.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 mb-2">
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
                                Escaneado: {item.timestamp}
                              </p>
                              {item.lastCounted && (
                                <p className="text-green-400/60 text-xs font-light tracking-wide">
                                  Contado: {item.lastCounted}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-center space-y-2">
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
                                    contadas
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

            {/* Cards adicionales de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card
                title="Estado del Sistema"
                variant="default"
                icon={
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Cámara</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg font-medium">Lista</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Escáner</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg font-medium">Activo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Base de datos</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg font-medium">Conectada</span>
                  </div>
                </div>
              </Card>

              <Card
                title="Estadísticas de Sesión"
                variant="secondary"
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Productos</span>
                    <span className="text-white/90 font-semibold">{getTotalProductsScanned()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Unidades</span>
                    <span className="text-white/90 font-semibold">{getTotalItemsCounted()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Precisión</span>
                    <span className="text-green-400 font-semibold">100%</span>
                  </div>
                </div>
              </Card>

              <Card
                title="Última Actividad"
                variant="primary"
                icon={
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="text-center py-2">
                  {scannedItems.length > 0 ? (
                    <div>
                      <p className="text-white/90 text-sm font-medium mb-1">
                        {scannedItems[0].name}
                      </p>
                      <p className="text-white/60 text-xs">
                        {scannedItems[0].timestamp.split(' ')[1]}
                      </p>
                      {scannedItems[0].count && (
                        <p className="text-green-400 text-xs mt-1">
                          {scannedItems[0].count} unidades contadas
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/70 text-sm">
                      Sin actividad reciente
                    </p>
                  )}
                </div>
              </Card>
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