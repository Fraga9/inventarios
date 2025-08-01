import { useState } from 'react';
import { BarcodeCard, ErrorBoundary } from '../index';
import Card from '../Card/Card';

export function ScanInventoryScreen({ onScanBarcode }) {
  const [recentScans, setRecentScans] = useState([]);

  const handleScan = (barcode) => {
    // Add to recent scans locally
    setRecentScans(prev => [{
      barcode,
      timestamp: new Date().toLocaleTimeString('es-MX'),
      id: Date.now()
    }, ...prev.slice(0, 9)]); // Keep last 10 scans
    
    // Pass to parent handler
    onScanBarcode(barcode);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-white/95 mb-4">
          Escanear <span className="font-semibold text-red-400">Inventario</span>
        </h2>
        <p className="text-white/60 font-light text-lg max-w-2xl mx-auto">
          Utiliza la cámara para escanear códigos de barras y realizar conteos de inventario
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Scanner Card - Takes 2 columns */}
        <div className="xl:col-span-2">
          <Card
            title="Escáner de Códigos"
            variant="primary"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
            }
          >
            <div className="h-[500px]">
              <ErrorBoundary>
                <BarcodeCard onScanBarcode={handleScan} />
              </ErrorBoundary>
            </div>
          </Card>
        </div>

        {/* Recent Scans */}
        <div className="xl:col-span-1">
          <Card
            title="Escaneos Recientes"
            variant="secondary"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <div className="h-[500px] overflow-y-auto">
              {recentScans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h4.5v4.5h-4.5v-4.5z" />
                    </svg>
                  </div>
                  <h4 className="text-white/70 text-base font-medium mb-2">
                    Sin escaneos recientes
                  </h4>
                  <p className="text-white/40 text-sm">
                    Los códigos escaneados aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan) => (
                    <div 
                      key={scan.id}
                      className="p-4 rounded-xl bg-white/[0.06] border border-white/[0.12]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-white/90 text-sm font-medium">
                            {scan.barcode}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {scan.timestamp}
                          </p>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8">
        <Card variant="default" className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <h4 className="text-white/90 font-medium">1. Permitir Cámara</h4>
              <p className="text-white/60 text-sm">
                Autoriza el acceso a la cámara cuando se solicite
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h4.5v4.5h-4.5v-4.5z" />
                </svg>
              </div>
              <h4 className="text-white/90 font-medium">2. Escanear Código</h4>
              <p className="text-white/60 text-sm">
                Apunta la cámara al código de barras del producto
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h4 className="text-white/90 font-medium">3. Contar Inventario</h4>
              <p className="text-white/60 text-sm">
                Ingresa la cantidad actual del producto
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}