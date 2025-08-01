import { supabase } from '../config/supabase';

export class AuthService {
  // Sign in with email and password
  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user profile data
      try {
        const userProfile = await this.getUserProfile(data.user.id);
        return {
          user: data.user,
          session: data.session,
          profile: userProfile
        };
      } catch (profileError) {
        console.warn('Profile fetch failed, using fallback:', profileError);
        // Return with minimal profile data if profile fetch fails
        return {
          user: data.user,
          session: data.session,
          profile: {
            id: data.user.id,
            full_name: data.user.email,
            role: 'sucursal',
            id_sucursal: null,
            is_active: true
          }
        };
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  }

  // Sign up with email, password and additional info
  static async signUp(email, password, fullName, idSucursal) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            id_sucursal: idSucursal
          }
        }
      });

      if (error) throw error;

      // Update user profile with sucursal info
      if (data.user) {
        await this.updateUserProfile(data.user.id, {
          id_sucursal: idSucursal,
          full_name: fullName
        });
      }

      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw new Error(error.message || 'Error al registrarse');
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Error al cerrar sesión');
    }
  }

  // Get current session
  static async getSession() {
    try {
      console.log('Getting session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        console.log('Session found, getting profile for:', session.user.email);
        try {
          const profile = await this.getUserProfile(session.user.id);
          return {
            session,
            user: session.user,
            profile
          };
        } catch (profileError) {
          console.error('Profile fetch failed, but allowing login:', profileError);
          // Allow login even if profile fetch fails
          return {
            session,
            user: session.user,
            profile: null
          };
        }
      }
      
      console.log('No session found');
      return { session: null, user: null, profile: null };
    } catch (error) {
      console.error('Error getting session:', error);
      return { session: null, user: null, profile: null };
    }
  }

  // Get user profile from users table
  static async getUserProfile(userId) {
    try {
      // First get the user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Then get sucursal info if user has one assigned
      let sucursalData = null;
      if (userData.id_sucursal) {
        const { data: sucursal, error: sucursalError } = await supabase
          .from('sucursales')
          .select('*')
          .eq('id_sucursal', userData.id_sucursal)
          .single();

        if (!sucursalError) {
          sucursalData = sucursal;
        }
      }

      return {
        ...userData,
        sucursales: sucursalData
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Error al obtener perfil de usuario');
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Error al actualizar perfil');
    }
  }

  // Get all sucursales for selection
  static async getSucursales() {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('*')
        .order('Sucursal');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting sucursales:', error);
      throw new Error('Error al obtener sucursales');
    }
  }

  // Check if user is admin
  static isAdmin(userProfile) {
    return userProfile?.role === 'admin';
  }

  // Get all users (admin only)
  static async getAllUsers() {
    try {
      // First get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('full_name');

      if (usersError) throw usersError;

      // Then get sucursal info for each user that has one
      const usersWithSucursales = await Promise.all(
        usersData.map(async (user) => {
          if (user.id_sucursal) {
            const { data: sucursal, error: sucursalError } = await supabase
              .from('sucursales')
              .select('id_sucursal, Sucursal, Región')
              .eq('id_sucursal', user.id_sucursal)
              .single();

            return {
              ...user,
              sucursales: sucursalError ? null : sucursal
            };
          }
          return {
            ...user,
            sucursales: null
          };
        })
      );

      return usersWithSucursales;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Error al obtener usuarios');
    }
  }

  // Update user role (admin only)
  static async updateUserRole(userId, role, idSucursal = null) {
    try {
      const updates = { role };
      if (idSucursal !== null) {
        updates.id_sucursal = idSucursal;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Error al actualizar rol de usuario');
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      let profile = null;
      
      if (session?.user) {
        try {
          console.log('Fetching profile for auth change:', session.user.email);
          profile = await this.getUserProfile(session.user.id);
        } catch (error) {
          console.error('Error getting profile on auth change:', error);
          // Continue without profile to avoid blocking
          profile = null;
        }
      }
      
      try {
        callback(event, session, profile);
      } catch (callbackError) {
        console.error('Error in auth state change callback:', callbackError);
      }
    });
  }

  // Password reset
  static async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error(error.message || 'Error al enviar email de recuperación');
    }
  }

  // Update password
  static async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error(error.message || 'Error al actualizar contraseña');
    }
  }
}