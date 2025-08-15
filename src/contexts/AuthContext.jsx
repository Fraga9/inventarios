import { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '../services/authService';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSucursal, setSelectedSucursal] = useState(null); // Sucursal seleccionada por admin
  const [showSucursalModal, setShowSucursalModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authListener = null;

    const initAuth = async () => {
      try {        
        if (!mounted) return;
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          try {
            const userProfile = await AuthService.getUserProfile(currentSession.user.id);
            setProfile(userProfile);
            
            // Si es admin y no hay sucursal seleccionada, mostrar modal
            if (userProfile?.role === 'admin' && !selectedSucursal) {
              setShowSucursalModal(true);
            }
          } catch (profileError) {
            console.error('Error loading user profile:', profileError);
            const fallbackProfile = {
              id: currentSession.user.id,
              full_name: currentSession.user.email,
              role: 'sucursal',
              id_sucursal: null,
              is_active: true
            };
            setProfile(fallbackProfile);
          }
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        // Set up auth state listener
        authListener = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          switch (event) {
            case 'SIGNED_IN':
              if (session?.user) {
                setSession(session);
                setUser(session.user);
                
                try {
                  const userProfile = await AuthService.getUserProfile(session.user.id);
                  setProfile(userProfile);
                  
                  // Si es admin y no hay sucursal seleccionada, mostrar modal
                  if (userProfile?.role === 'admin' && !selectedSucursal) {
                    setShowSucursalModal(true);
                  }
                } catch (profileError) {
                  console.error('Error loading profile on signin:', profileError);
                  setProfile({
                    id: session.user.id,
                    full_name: session.user.email,
                    role: 'sucursal',
                    id_sucursal: null,
                    is_active: true
                  });
                }
              }
              break;
              
            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setProfile(null);
              setSelectedSucursal(null);
              setShowSucursalModal(false);
              break;
              
            case 'TOKEN_REFRESHED':
              if (session) {
                setSession(session);
                setUser(session.user);
              }
              break;
          }
        });

        if (mounted) {
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AuthService.signOut();
    setSelectedSucursal(null);
    setShowSucursalModal(false);
  };

  const selectSucursal = (sucursal) => {
    setSelectedSucursal(sucursal);
    setShowSucursalModal(false);
  };

  const openSucursalModal = () => {
    setShowSucursalModal(true);
  };

  const closeSucursalModal = () => {
    setShowSucursalModal(false);
  };

  // Función helper para obtener el ID de sucursal efectivo
  const getEffectiveSucursalId = () => {
    if (profile?.role === 'admin') {
      return selectedSucursal?.id_sucursal || null;
    }
    return profile?.id_sucursal || null;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!session,
    isAdmin: profile?.role === 'admin',
    sucursal: profile?.sucursales,
    selectedSucursal,
    showSucursalModal,
    getEffectiveSucursalId,
    login,
    logout,
    selectSucursal,
    openSucursalModal,
    closeSucursalModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};