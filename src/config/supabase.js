import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
// IMPORTANTE: Reemplaza estas URLs y keys con las de tu proyecto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || null;

// Cliente principal para operaciones normales
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Mantener sesión activa
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});

// Cliente administrativo para operaciones que requieren service role
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Configuración de la aplicación
export const APP_CONFIG = {
  // ID de sucursal por defecto (ajusta según tu implementación)
  DEFAULT_SUCURSAL_ID: 1,
  
  // Usuario por defecto para registrar movimientos
  DEFAULT_USER: 'Sistema_Inventario',
  
  // Límite de items en el historial
  HISTORY_LIMIT: 10,
};