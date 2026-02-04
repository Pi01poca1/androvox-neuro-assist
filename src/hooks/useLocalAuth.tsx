import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import type { AppRole } from '@/types/roles';
import type { LocalUserProfile, LocalAuthContextType } from '@/types/localAuth';
import { useToast } from '@/hooks/use-toast';
import {
  getLocalSession,
  setLocalSession,
  clearLocalSession,
  getUserById,
  getUserByEmail,
  createUser,
  createClinic,
  verifyPassword,
  type LocalUser,
} from '@/lib/localDb';

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

function userToProfile(user: LocalUser): LocalUserProfile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    clinic_id: user.clinic_id,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUserProfile | null>(null);
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
        const clinic = await createClinic(clinicName || 'Meu Consultório', logoData);
        clinicId = clinic.id;
      } else {
        // For secretaries, they need to be invited to an existing clinic
        // For now, we'll create a placeholder - in real use, secretaries
        // would be added through the team management
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
    // In local mode, password reset is not supported via email
    // User would need to have another admin reset it, or we could implement
    // a security question system
    toast({
      title: "Funcionalidade offline",
      description: "Em modo offline, solicite a redefinição de senha ao administrador do sistema.",
      variant: "destructive",
    });
    return { error: new Error('Redefinição de senha não disponível no modo offline') };
  };

  const value: LocalAuthContextType = {
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

  return <LocalAuthContext.Provider value={value}>{children}</LocalAuthContext.Provider>;
}

export function useLocalAuth() {
  const context = useContext(LocalAuthContext);
  if (context === undefined) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider');
  }
  return context;
}

// Re-export as useAuth for compatibility
export { useLocalAuth as useAuth, LocalAuthProvider as AuthProvider };
