import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
// IMPORTANTE: Reemplaza estas URLs y keys con las de tu proyecto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No necesitamos autenticación por ahora
  },
});

// Configuración de la aplicación
export const APP_CONFIG = {
  // ID de sucursal por defecto (ajusta según tu implementación)
  DEFAULT_SUCURSAL_ID: 1,
  
  // Usuario por defecto para registrar movimientos
  DEFAULT_USER: 'Sistema_Inventario',
  
  // Límite de items en el historial
  HISTORY_LIMIT: 10,
};