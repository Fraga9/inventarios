import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import Card from '../Card/Card';

export function Register({ onBack, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    idSucursal: ''
  });
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSucursales();
  }, []);

  const loadSucursales = async () => {
    try {
      setLoadingSucursales(true);
      const data = await AuthService.getSucursales();
      setSucursales(data);
    } catch (error) {
      console.error('Error loading sucursales:', error);
      setError('Error al cargar sucursales');
    } finally {
      setLoadingSucursales(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password || !formData.fullName || !formData.idSucursal) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await AuthService.signUp(
        formData.email,
        formData.password,
        formData.fullName,
        parseInt(formData.idSucursal)
      );
      
      onRegisterSuccess && onRegisterSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 backdrop-blur-xl border-b border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08]">
        <div className="py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-light text-white/95 tracking-wide text-center">
              <span className="font-semibold text-red-400">Promexma</span>
              <span className="mx-4 text-white/30">|</span>
              <span className="text-white/80 font-light">Registro de Usuario</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="w-full max-w-md mt-32">
        <Card variant="primary" title="Solicitar Acceso">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Input */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-white/90">
                Nombre Completo
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all"
                placeholder="Tu nombre completo"
                disabled={loading}
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white/90">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>

            {/* Sucursal Selection */}
            <div className="space-y-2">
              <label htmlFor="idSucursal" className="block text-sm font-medium text-white/90">
                Sucursal
              </label>
              <select
                id="idSucursal"
                name="idSucursal"
                value={formData.idSucursal}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all"
                disabled={loading || loadingSucursales}
              >
                <option value="" className="bg-slate-800 text-white">
                  Selecciona tu sucursal
                </option>
                {sucursales.map((sucursal) => (
                  <option 
                    key={sucursal.id_sucursal} 
                    value={sucursal.id_sucursal}
                    className="bg-slate-800 text-white"
                  >
                    {sucursal.Sucursal} - {sucursal.Región}
                  </option>
                ))}
              </select>
              {loadingSucursales && (
                <p className="text-white/50 text-xs">Cargando sucursales...</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all"
                placeholder="Repite tu contraseña"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-red-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingSucursales}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Registrando...</span>
                </div>
              ) : (
                'Solicitar Acceso'
              )}
            </button>
          </form>

          {/* Back Button */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={onBack}
              className="w-full text-white/70 hover:text-white text-sm transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        </Card>

        {/* Information */}
        <div className="mt-8">
          <Card variant="secondary" title="Proceso de Registro">
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-blue-400 mt-0.5">
                  <span className="block w-full h-full text-center font-bold text-xs leading-5">1</span>
                </div>
                <div>
                  <p className="font-medium text-white/90">Completa el formulario</p>
                  <p>Proporciona tu información y selecciona tu sucursal</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-blue-400 mt-0.5">
                  <span className="block w-full h-full text-center font-bold text-xs leading-5">2</span>
                </div>
                <div>
                  <p className="font-medium text-white/90">Verificación</p>
                  <p>Un administrador revisará y activará tu cuenta</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-blue-400 mt-0.5">
                  <span className="block w-full h-full text-center font-bold text-xs leading-5">3</span>
                </div>
                <div>
                  <p className="font-medium text-white/90">Confirmación por email</p>
                  <p>Recibirás un correo cuando tu cuenta esté lista</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}