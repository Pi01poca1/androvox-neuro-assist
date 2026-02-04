import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import type { AppRole } from '@/types/roles';
import type { UserProfile, AuthContextType } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import {
  getLocalSession,
  setLocalSession,
  clearLocalSession,
  getUserById,
  getUserByEmail,
  createUser,
  createClinic,
  getClinicUsers,
  verifyPassword,
  type LocalUser,
} from '@/lib/localDb';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function userToProfile(user: LocalUser): UserProfile {
  return {
    id: user.id,
    full_name: user.full_name,
    clinic_id: user.clinic_id,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load user from local session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const userId = await getLocalSession();
        if (userId) {
          const userData = await getUserById(userId);
          if (userData) {
            setUser(userToProfile(userData));
          } else {
            // Session exists but user not found, clear it
            await clearLocalSession();
          }
        }
      } catch (error) {
        console.error('Error loading local session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const userData = await getUserByEmail(email.toLowerCase().trim());
      
      if (!userData) {
        toast({
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        return { error: new Error('Email ou senha incorretos') };
      }

      const isValid = await verifyPassword(password, userData.password_hash);
      
      if (!isValid) {
        toast({
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        return { error: new Error('Email ou senha incorretos') };
      }

      // Set local session
      await setLocalSession(userData.id);
      setUser(userToProfile(userData));

      toast({
        title: "Login realizado!",
        description: `Bem-vindo(a), ${userData.full_name}`,
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Erro ao fazer login",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    clinicName?: string,
    logoData?: string | null
  ): Promise<{ error: Error | null }> => {
    try {
      // For professionals, create a new clinic
      let clinicId: string;
      
      if (role === 'profissional') {
        const clinic = await createClinic(clinicName || 'Minha Clínica', logoData);
        clinicId = clinic.id;
      } else {
        // For secretaries, they need to be invited to an existing clinic
        toast({
          title: "Erro ao criar conta",
          description: "Secretários precisam ser convidados por um profissional",
          variant: "destructive",
        });
        return { error: new Error('Secretários precisam ser convidados por um profissional') };
      }

      const userData = await createUser(
        email.toLowerCase().trim(),
        password,
        fullName,
        role,
        clinicId
      );

      // Auto-login after signup
      await setLocalSession(userData.id);
      setUser(userToProfile(userData));

      toast({
        title: "Conta criada!",
        description: "Seu cadastro foi realizado com sucesso.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Erro ao criar conta",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signOut = async (): Promise<void> => {
    await clearLocalSession();
    setUser(null);
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
  };

  const resetPassword = async (_email: string): Promise<{ error: Error | null }> => {
    // In local mode, password reset requires admin
    toast({
      title: "Modo Offline",
      description: "Solicite a redefinição de senha ao administrador do sistema.",
      variant: "destructive",
    });
    return { error: new Error('Redefinição de senha não disponível no modo offline') };
  };

  const value: AuthContextType = {
    user,
    profile: user,
    userRole: user?.role ?? null,
    clinicId: user?.clinic_id ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to add secretary to clinic (for team management)
export async function addSecretaryToClinic(
  email: string,
  password: string,
  fullName: string,
  clinicId: string
): Promise<{ user: LocalUser | null; error: Error | null }> {
  try {
    const userData = await createUser(
      email.toLowerCase().trim(),
      password,
      fullName,
      'secretario',
      clinicId
    );
    return { user: userData, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

// Helper to get team members
export async function getTeamMembers(clinicId: string): Promise<LocalUser[]> {
  return getClinicUsers(clinicId);
}
