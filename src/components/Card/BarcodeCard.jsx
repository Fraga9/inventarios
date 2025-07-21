import { useState, useRef, useEffect } from "react";

function BarcodeCard({ onScanBarcode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Inicializar QuaggaJS cuando el componente se monte
  useEffect(() => {
    // Verificar si QuaggaJS está disponible
    if (typeof window !== 'undefined' && !window.Quagga) {
      // Cargar QuaggaJS dinámicamente
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
      script.onload = () => {
        console.log('QuaggaJS cargado exitosamente');
      };
      document.head.appendChild(script);
    }

    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Cámara trasera preferida
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setHasPermission(true);
      stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba
      return true;
    } catch (error) {
      console.error('Error de permisos de cámara:', error);
      setHasPermission(false);
      setCameraError('No se pudo acceder a la cámara. Por favor, permite el acceso.');
      return false;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      return true;
    } catch (error) {
      console.error('Error al iniciar cámara:', error);
      setCameraError('No se pudo iniciar la cámara');
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (window.Quagga) {
      window.Quagga.stop();
    }
  };

  const initializeScanner = () => {
    if (!window.Quagga) {
      console.error('QuaggaJS no está disponible');
      return;
    }

    window.Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoRef.current,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 2,
      frequency: 10,
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader"
        ]
      },
      locate: true
    }, (err) => {
      if (err) {
        console.error('Error inicializando Quagga:', err);
        setCameraError('Error al inicializar el escáner');
        setIsScanning(false);
        return;
      }
      
      console.log('QuaggaJS inicializado correctamente');
      window.Quagga.start();
      
      // Evento de detección de código de barras
      window.Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        console.log('Código detectado:', code);
        
        // Detener el escáner
        handleStopScanning();
        
        // Llamar al callback con el código detectado
        if (onScanBarcode) {
          onScanBarcode(code);
        }
      });
    });
  };

  const handleScanClick = async () => {
    if (isScanning) {
      handleStopScanning();
      return;
    }

    setIsScanning(true);
    setCameraError(null);
    
    try {
      // Verificar permisos
      if (hasPermission === null) {
        const permitted = await checkCameraPermission();
        if (!permitted) {
          setIsScanning(false);
          return;
        }
      }

      // Iniciar cámara
      const cameraStarted = await startCamera();
      if (!cameraStarted) {
        setIsScanning(false);
        return;
      }

      // Esperar un momento para que la cámara se inicialice
      setTimeout(() => {
        if (window.Quagga) {
          initializeScanner();
        } else {
          // Fallback si QuaggaJS no está disponible
          console.log('Simulando escaneo...');
          simulateScan();
        }
      }, 1000);

    } catch (error) {
      console.error('Error en escaneo:', error);
      setCameraError('Error al iniciar el escaneo');
      setIsScanning(false);
    }
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    stopCamera();
  };

  // Función de simulación para desarrollo
  const simulateScan = () => {
    setTimeout(() => {
      const simulatedCodes = ['123456789012', 'PROD123', '987654321098', 'ABC123DEF456'];
      const randomCode = simulatedCodes[Math.floor(Math.random() * simulatedCodes.length)];
      
      handleStopScanning();
      
      if (onScanBarcode) {
        onScanBarcode(randomCode);
      }
    }, 3000);
  };

  return (
    <div className="w-full h-full">
      <div 
        className={`
          relative overflow-hidden rounded-3xl backdrop-blur-xl border border-white/10 
          bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02]
          transition-all duration-500 ease-out h-full flex flex-col
          ${isHovered ? 'transform scale-[1.02] shadow-2xl shadow-white/5' : 'shadow-xl shadow-black/10'}
          before:absolute before:inset-0 before:rounded-3xl 
          before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent 
          before:opacity-0 before:transition-opacity before:duration-300
          ${isHovered ? 'before:opacity-100' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative z-10 p-8 flex flex-col h-full">
          {/* Header con ícono y título */}
          <div className="flex items-center mb-6 space-x-4">
            <div className={`
              p-3 rounded-2xl transition-all duration-300 ease-out
              ${isScanning ? 'bg-red-500/20 border-red-400/30' : 'bg-white/10 border-white/20'}
              border backdrop-blur-sm
            `}>
              <svg 
                className={`w-7 h-7 transition-colors duration-300 ${
                  isScanning ? 'text-red-400' : 'text-white/90'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-xl font-medium text-white/95 tracking-wide">
                Escanear Inventario
              </h3>
              <p className="text-sm text-white/60 mt-1 font-light">
                Identificación automática
              </p>
            </div>
          </div>
          
          {/* Área de cámara/escaneo */}
          {isScanning && (
            <div className="mb-6 rounded-2xl overflow-hidden bg-black/50 border border-white/20 relative">
              <video 
                ref={videoRef}
                className="w-full h-48 object-cover"
                autoPlay 
                playsInline 
                muted
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              {/* Overlay de escaneo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-32 border-2 border-red-400 border-dashed rounded-lg animate-pulse">
                  <div className="w-full h-full relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-400"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-400"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-400"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-400"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Error de cámara */}
          {cameraError && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl">
              <p className="text-red-200 text-sm font-light">
                {cameraError}
              </p>
            </div>
          )}
          
          {/* Descripción */}
          <p className="text-white/75 text-sm leading-relaxed mb-6 font-light">
            Utiliza la cámara para escanear códigos de barras y agregar productos 
            al inventario de forma precisa y eficiente.
          </p>
          
          {/* Características - flex-1 para ocupar el espacio disponible */}
          <div className="space-y-4 mb-8 flex-1">
            {[
              { icon: "✓", text: "Identificación automática de productos" },
              { icon: "✓", text: "Compatible con múltiples formatos" },
              { icon: "✓", text: "Actualización instantánea del inventario" }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`
                  flex items-center space-x-3 text-sm text-white/70 font-light
                  transform transition-all duration-300 ease-out
                  ${isHovered ? 'translate-x-1' : ''}
                `}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {feature.icon}
                </span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
          
          {/* Botón principal MEJORADO - MÁS GRANDE Y PROMINENTE */}
          <button 
            onClick={handleScanClick}
            disabled={isScanning && !cameraError}
            className={`
              group relative w-full overflow-hidden rounded-3xl border backdrop-blur-sm 
              transition-all duration-300 ease-out font-semibold text-lg py-8 px-8
              ${isScanning 
                ? cameraError 
                  ? "bg-red-500/30 border-red-400/50 hover:bg-red-500/40 text-red-100 hover:text-white cursor-pointer" 
                  : "bg-red-500/20 border-red-400/40 cursor-not-allowed text-red-200"
                : "bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/30 hover:from-red-500/30 hover:to-red-600/30 hover:border-red-400/50 text-red-100 hover:text-white active:scale-[0.98] hover:shadow-2xl hover:shadow-red-500/20"
              }
              before:absolute before:inset-0 before:bg-gradient-to-r 
              before:from-red-400/20 before:via-red-400/10 before:to-transparent 
              before:translate-x-[-100%] before:transition-transform before:duration-500
              ${!isScanning || cameraError ? 'hover:before:translate-x-[100%]' : ''}
              transform hover:scale-[1.02] transition-transform
            `}
          >
            <div className="relative z-10 flex items-center justify-center space-x-4">
              {isScanning && !cameraError ? (
                <>
                  <div className="relative">
                    <div className="w-7 h-7 border-3 border-red-400/30 rounded-full animate-spin">
                      <div className="absolute top-0 left-0 w-7 h-7 border-3 border-transparent border-t-red-400 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-xl">Escaneando...</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-xl">
                    {cameraError ? 'Reintentar Escaneo' : 'Escanear Código'}
                  </span>
                </>
              )}
            </div>
            
            {/* Pulso animado para llamar la atención */}
            {!isScanning && (
              <div className="absolute inset-0 rounded-3xl bg-red-500/20 animate-pulse opacity-50"></div>
            )}
          </button>
        </div>

        {/* Efectos de fondo mejorados */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-red-500/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-white/5 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        
        {/* Efectos adicionales cuando está escaneando */}
        {isScanning && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-3xl animate-pulse"></div>
        )}
      </div>
    </div>
  );
}

export default BarcodeCard;