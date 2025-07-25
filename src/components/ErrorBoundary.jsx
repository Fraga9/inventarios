import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de logging
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Si es un error de QuaggaJS, intentar limpiar
    if (error.message && error.message.includes('Quagga') || 
        error.stack && error.stack.includes('quagga')) {
      console.log('Error de QuaggaJS detectado, intentando limpiar...');
      try {
        if (window.Quagga) {
          window.Quagga.stop();
        }
      } catch (cleanupError) {
        console.error('Error al limpiar QuaggaJS:', cleanupError);
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full">
          <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl border border-red-400/30 bg-gradient-to-br from-red-500/[0.15] via-red-500/[0.08] to-red-500/[0.04] shadow-xl shadow-black/10">
            <div className="relative z-10 p-8 flex flex-col h-full">
              {/* Header con ícono de error */}
              <div className="flex items-center mb-6 space-x-4">
                <div className="p-3 rounded-2xl bg-red-500/20 border border-red-400/30 backdrop-blur-sm">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-white/95 tracking-wide">
                    Error del Escáner
                  </h3>
                  <p className="text-sm text-white/60 mt-1 font-light">
                    Problema técnico detectado
                  </p>
                </div>
              </div>
              
              {/* Mensaje de error */}
              <div className="mb-6 p-4 bg-red-500/10 border border-red-400/20 rounded-2xl">
                <h4 className="text-red-200 font-medium mb-2">¿Qué pasó?</h4>
                <p className="text-red-200/80 text-sm mb-3">
                  Ocurrió un error técnico con el componente de escaneo. Esto puede suceder cuando:
                </p>
                <ul className="text-red-200/70 text-sm space-y-1 list-disc list-inside">
                  <li>La librería de escaneo encuentra un conflicto</li>
                  <li>Hay problemas con el acceso a la cámara</li>
                  <li>Se produce un error interno del navegador</li>
                </ul>
              </div>

              {/* Sugerencias */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <h4 className="text-white/90 font-medium mb-2">Soluciones sugeridas:</h4>
                <div className="space-y-2 text-white/70 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white/80 text-xs flex items-center justify-center font-medium">1</span>
                    <span>Haz clic en "Reintentar" para resetear el escáner</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white/80 text-xs flex items-center justify-center font-medium">2</span>
                    <span>Usa "Entrada Manual" como alternativa</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white/80 text-xs flex items-center justify-center font-medium">3</span>
                    <span>Recarga la página si el problema persiste</span>
                  </div>
                </div>
              </div>

              {/* Detalles técnicos (colapsable) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 p-4 bg-gray-500/10 border border-gray-400/20 rounded-2xl">
                  <summary className="text-gray-300 font-medium cursor-pointer hover:text-white transition-colors">
                    Detalles técnicos (desarrollo)
                  </summary>
                  <div className="mt-3 p-3 bg-black/20 rounded-lg">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                      {this.state.error.toString()}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
              
              {/* Botones de acción */}
              <div className="flex space-x-4 mt-auto">
                <button 
                  onClick={this.handleRetry}
                  className="flex-1 group relative overflow-hidden rounded-2xl border border-red-400/30 bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 hover:border-red-400/50 text-red-100 hover:text-white transition-all duration-300 ease-out font-medium text-sm py-4 px-6 active:scale-[0.98]"
                >
                  <div className="relative z-10 flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Reintentar</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 group relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all duration-300 ease-out font-medium text-sm py-4 px-6 active:scale-[0.98]"
                >
                  <div className="relative z-10 flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Recargar Página</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Efectos de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-red-500/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-red-500/8 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;