import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../Card/Card';

export function Login({ onLogin, onRegister }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await login(formData.email, formData.password);
      
      // Check if user has a sucursal assigned or is admin
      if (!result.profile.id_sucursal && result.profile.role !== 'admin') {
        throw new Error('Tu cuenta no tiene una sucursal asignada. Contacta al administrador.');
      }

      onLogin(result);
    } catch (error) {
      console.error('Login error:', error);
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
              <span className="text-white/80 font-light">Control Interno</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md mt-32">
        <Card variant="primary" title="Iniciar Sesión">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="••••••••"
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Additional Actions */}
          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <button
              onClick={() => onRegister && onRegister()}
              className="w-full text-white/70 hover:text-white text-sm transition-colors"
            >
              ¿No tienes cuenta? Solicitar acceso
            </button>
            
            <button
              onClick={() => {
                const email = prompt('Introduce tu correo electrónico para recuperar la contraseña:');
                if (email) {
                  AuthService.resetPassword(email)
                    .then(() => alert('Se ha enviado un correo para recuperar tu contraseña'))
                    .catch(error => alert(`Error: ${error.message}`));
                }
              }}
              className="w-full text-white/50 hover:text-white/70 text-xs transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </Card>

        {/* Information Card */}
        <div className="mt-8">
          <Card variant="secondary" title="Información de Acceso">
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-blue-400 mt-0.5">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white/90">Usuarios de Sucursal</p>
                  <p>Acceso limitado a inventario de su sucursal asignada</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-red-400 mt-0.5">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white/90">Administradores</p>
                  <p>Acceso completo a todas las sucursales y análisis</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}