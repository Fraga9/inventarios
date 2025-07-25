import { useState, useRef, useEffect } from "react";

function BarcodeCard({ onScanBarcode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Inicializar QuaggaJS cuando el componente se monte
  useEffect(() => {
    let cleanup = false;
    
    // Verificar si QuaggaJS está disponible
    if (typeof window !== 'undefined' && !window.Quagga) {
      // Cargar QuaggaJS dinámicamente
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
      script.onload = () => {
        if (!cleanup) {
          console.log('QuaggaJS cargado exitosamente');
        }
      };
      script.onerror = () => {
        console.error('Error cargando QuaggaJS');
      };
      document.head.appendChild(script);
    }

    return () => {
      cleanup = true;
      // Usar setTimeout para dar tiempo a que terminen las operaciones pendientes
      setTimeout(() => {
        stopCamera();
      }, 100);
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Verificar si mediaDevices está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no está disponible en este navegador');
      }

      // Primero intentar con cámara trasera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          } 
        });
      } catch (envError) {
        console.log('Cámara trasera no disponible, intentando con cualquier cámara:', envError);
        // Si falla, intentar con cualquier cámara disponible
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          } 
        });
      }
      
      setHasPermission(true);
      setCameraError(null);
      stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba
      return true;
    } catch (error) {
      console.error('Error de permisos de cámara:', error);
      setHasPermission(false);
      
      let errorMessage = 'No se pudo acceder a la cámara. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permisos denegados. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No se encontró ninguna cámara disponible.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'La cámara está siendo usada por otra aplicación.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'La cámara no cumple con los requisitos especificados.';
      } else {
        errorMessage += error.message || 'Error desconocido.';
      }
      
      setCameraError(errorMessage);
      return false;
    }
  };

  const startCamera = async () => {
    try {
      // Usar la misma lógica que checkCameraPermission pero sin detener el stream
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          }
        });
      } catch (envError) {
        console.log('Cámara trasera no disponible, usando cámara por defecto:', envError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          }
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraError(null);
      return true;
    } catch (error) {
      console.error('Error al iniciar cámara:', error);
      
      let errorMessage = 'No se pudo iniciar la cámara. ';
      if (error.name === 'NotReadableError') {
        errorMessage += 'La cámara está siendo usada por otra aplicación. Por favor, cierra otras aplicaciones que puedan estar usando la cámara.';
      } else {
        errorMessage += error.message || 'Error desconocido.';
      }
      
      setCameraError(errorMessage);
      return false;
    }
  };

  const stopCamera = () => {
    // Detener stream de video
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping video track:', error);
        }
      });
      streamRef.current = null;
    }
    
    // Detener QuaggaJS de manera completamente segura
    if (window.Quagga) {
      try {
        // Verificar si Quagga está inicializado antes de parar
        if (window.Quagga.initialized) {
          window.Quagga.stop();
        }
      } catch (error) {
        console.warn('Error stopping QuaggaJS:', error);
        
        // Si falla el stop normal, intentar reset completo
        try {
          // Limpiar listeners
          if (typeof window.Quagga.offDetected === 'function') {
            window.Quagga.offDetected();
          }
          if (typeof window.Quagga.offProcessed === 'function') {
            window.Quagga.offProcessed();
          }
          
          // Limpiar propiedades internas si existen
          if (window.Quagga.CameraAccess) {
            window.Quagga.CameraAccess = null;
          }
          if (window.Quagga.InputStream) {
            window.Quagga.InputStream = null;
          }
          
          // Marcar como no inicializado
          window.Quagga.initialized = false;
          
        } catch (deepError) {
          console.warn('Error in deep QuaggaJS cleanup:', deepError);
          
          // Último recurso: recrear el objeto Quagga
          try {
            delete window.Quagga;
          } catch (deleteError) {
            console.warn('Could not delete Quagga object:', deleteError);
          }
        }
      }
    }
  };

  const initializeScanner = () => {
    if (!window.Quagga) {
      console.error('QuaggaJS no está disponible');
      setCameraError('Error: Librería de escaneo no disponible');
      return;
    }

    if (!videoRef.current) {
      console.error('Video element no disponible');
      setCameraError('Error: Elemento de video no disponible');
      return;
    }

    // Limpiar detectores previos
    try {
      window.Quagga.offDetected();
      window.Quagga.offProcessed();
    } catch (cleanupError) {
      console.warn('Error limpiando detectores previos:', cleanupError);
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
      numOfWorkers: navigator.hardwareConcurrency > 2 ? 2 : 1,
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
      locate: true,
      debug: process.env.NODE_ENV === 'development' ? {
        showCanvas: false,
        showPatches: false,
        showFoundPatches: false,
        showSkeleton: false,
        showLabels: false,
        showPatchLabels: false,
        showRemainingPatchLabels: false,
        boxFromPatches: {
          showTransformed: false,
          showTransformedBox: false,
          showBB: false
        }
      } : false
    }, (err) => {
      if (err) {
        console.error('Error inicializando Quagga:', err);
        setCameraError('Error al inicializar el escáner: ' + (err.message || 'Error desconocido'));
        setIsScanning(false);
        return;
      }
      
      console.log('QuaggaJS inicializado correctamente');
      
      // Marcar como inicializado
      window.Quagga.initialized = true;
      
      try {
        window.Quagga.start();
        
        // Evento de detección de código de barras
        window.Quagga.onDetected(async (data) => {
          try {
            const code = data.codeResult.code;
            console.log('Código detectado:', code);
            
            // Detener el escáner
            handleStopScanning();
            
            // Llamar al callback con el código detectado (ahora es async)
            if (onScanBarcode) {
              await onScanBarcode(code);
            }
          } catch (detectionError) {
            console.error('Error procesando código detectado:', detectionError);
            setCameraError('Error procesando código detectado');
          }
        });

      } catch (startError) {
        console.error('Error iniciando Quagga:', startError);
        setCameraError('Error al iniciar el escáner');
        setIsScanning(false);
      }
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
    setTimeout(async () => {
      const simulatedCodes = ['123456789012', 'PROD123', '987654321098', 'ABC123DEF456'];
      const randomCode = simulatedCodes[Math.floor(Math.random() * simulatedCodes.length)];
      
      handleStopScanning();
      
      if (onScanBarcode) {
        await onScanBarcode(randomCode);
      }
    }, 3000);
  };

  // Manejar entrada manual de código de barras
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    
    setShowManualInput(false);
    
    if (onScanBarcode) {
      await onScanBarcode(manualBarcode.trim());
    }
    
    setManualBarcode('');
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    setManualBarcode('');
    if (isScanning) {
      handleStopScanning();
    }
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
          
          {/* Error de cámara con sugerencia de entrada manual */}
          {cameraError && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl">
              <p className="text-red-200 text-sm font-light mb-3">
                {cameraError}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-red-300/80 text-xs">
                  💡 Puedes ingresar el código manualmente
                </p>
                <button
                  onClick={toggleManualInput}
                  className="px-3 py-1 bg-red-500/30 hover:bg-red-500/40 border border-red-400/40 rounded-lg text-red-200 text-xs font-medium transition-colors"
                >
                  Entrada manual
                </button>
              </div>
            </div>
          )}

          {/* Entrada manual de código */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <h4 className="text-white/90 font-medium mb-3 text-sm">Ingresa el código manualmente</h4>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Código de barras..."
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-red-400/50 focus:bg-white/15 transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!manualBarcode.trim()}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-red-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓
                </button>
              </div>
            </form>
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
          
          {/* Botones de acción */}
          <div className="space-y-4">
            {/* Botón principal de escaneo */}
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

          {/* Botón de entrada manual alternativo */}
          {!isScanning && !cameraError && (
            <button
              onClick={toggleManualInput}
              className="group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all duration-300 ease-out font-medium text-sm py-4 px-6 active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center justify-center space-x-3">
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                <span>Ingresar código manualmente</span>
              </div>
            </button>
          )}
        </div>
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