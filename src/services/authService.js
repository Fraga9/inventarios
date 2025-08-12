import { supabase, supabaseAdmin } from '../config/supabase';

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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        try {
          const profile = await this.getUserProfile(session.user.id);
          return {
            session,
            user: session.user,
            profile
          };
        } catch (profileError) {
          console.error('Profile fetch failed, using fallback:', profileError);
          return {
            session,
            user: session.user,
            profile: {
              id: session.user.id,
              full_name: session.user.email,
              role: 'sucursal',
              id_sucursal: null,
              is_active: true
            }
          };
        }
      }
      
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
      let profile = null;
      
      if (session?.user) {
        try {
          profile = await this.getUserProfile(session.user.id);
        } catch (error) {
          console.error('Error getting profile on auth change:', error);
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

  // Check if admin operations are available
  static isAdminConfigured() {
    return supabaseAdmin !== null;
  }

  // Admin: Invite user by email (requires service key)
  static async inviteUser(email, fullName, idSucursal, role = 'sucursal') {
    try {
      if (!supabaseAdmin) {
        throw new Error('Operaciones administrativas no configuradas. Se requiere VITE_SUPABASE_SERVICE_KEY.');
      }

      console.log('Inviting user:', { email, fullName, idSucursal, role });

      // Create the auth user with invite using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          id_sucursal: idSucursal,
          role: role
        },
        redirectTo: `${window.location.origin}/login`
      });

      if (authError) throw authError;

      // Create the user profile record using regular client
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            full_name: fullName,
            id_sucursal: idSucursal,
            role: role,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (profileError) {
          console.warn('Profile creation failed:', profileError);
        }

        return {
          user: authData.user,
          profile: profileData
        };
      }

      return authData;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw new Error(error.message || 'Error al invitar usuario');
    }
  }

  // Admin: Create user directly (requires service key)
  static async createUserForSucursal(email, password, fullName, idSucursal, role = 'sucursal') {
    try {
      if (!supabaseAdmin) {
        throw new Error('Operaciones administrativas no configuradas. Se requiere VITE_SUPABASE_SERVICE_KEY.');
      }

      console.log('Creating user for sucursal:', { email, fullName, idSucursal, role });

      // Create the auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          id_sucursal: idSucursal,
          role: role
        }
      });

      if (authError) throw authError;

      // Create the user profile record using regular client
      if (authData.user) {
        console.log('Creating profile with data:', {
          id: authData.user.id,
          full_name: fullName,
          id_sucursal: idSucursal,
          role: role
        });

        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            full_name: fullName,
            id_sucursal: idSucursal,
            role: role,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation failed:', profileError);
          // Si el perfil falla, intentamos actualizar el existente
          console.log('Attempting to update existing profile...');
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({
              full_name: fullName,
              id_sucursal: idSucursal,
              role: role,
              is_active: true
            })
            .eq('id', authData.user.id)
            .select()
            .single();

          if (updateError) {
            console.error('Profile update also failed:', updateError);
            throw new Error(`Error al crear perfil de usuario: ${profileError.message}`);
          }

          console.log('Profile updated successfully:', updateData);
          return {
            user: authData.user,
            profile: updateData
          };
        }

        console.log('Profile created successfully:', profileData);
        return {
          user: authData.user,
          profile: profileData
        };
      }

      return authData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Error al crear usuario');
    }
  }

  // Alternative: Create user invitation record (works without service key)
  static async createUserInvitation(email, fullName, idSucursal, role = 'sucursal') {
    try {
      console.log('Creating user invitation:', { email, fullName, idSucursal, role });

      // Create invitation record in database
      const { data: invitationData, error: invitationError } = await supabase
        .from('user_invitations')
        .insert([{
          email,
          full_name: fullName,
          id_sucursal: idSucursal,
          role: role,
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }])
        .select()
        .single();

      if (invitationError) throw invitationError;

      return {
        invitation: invitationData,
        message: 'Invitación creada. El usuario debe registrarse usando el email invitado.'
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new Error(error.message || 'Error al crear invitación');
    }
  }

  // Admin: Deactivate user (soft delete)
  static async deactivateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw new Error('Error al desactivar usuario');
    }
  }

  // Admin: Reactivate user
  static async activateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error activating user:', error);
      throw new Error('Error al activar usuario');
    }
  }
}