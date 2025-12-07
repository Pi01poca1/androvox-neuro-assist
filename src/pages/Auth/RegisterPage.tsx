import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Loader2, UserRound, Briefcase, CheckCircle } from 'lucide-react';
import type { AppRole } from '@/types/roles';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [role, setRole] = useState<AppRole>('profissional');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // Check for invitation token in URL
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setInvitationToken(token);
      setRole('secretario');
      
      // Try to get invitation email
      const fetchInvitation = async () => {
        const { data } = await supabase
          .from('secretary_invitations')
          .select('email')
          .eq('token', token)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        
        if (data) {
          setInvitationEmail(data.email);
          setEmail(data.email);
        }
      };
      
      fetchInvitation();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !invitationToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, invitationToken]);

  // Accept invitation after registration
  useEffect(() => {
    const acceptInvitation = async () => {
      if (user && invitationToken && !invitationAccepted) {
        const { data, error } = await supabase.rpc('accept_secretary_invitation', {
          _invitation_token: invitationToken,
          _user_id: user.id,
        });
        
        if (data && !error) {
          setInvitationAccepted(true);
          // Reload to get updated profile with clinic_id
          window.location.href = '/dashboard';
        } else {
          navigate('/dashboard');
        }
      }
    };
    
    acceptInvitation();
  }, [user, invitationToken, invitationAccepted, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    if (password.length < 6) {
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      email, 
      password, 
      fullName, 
      role, 
      role === 'profissional' ? clinicName : undefined
    );
    
    if (!error && !invitationToken) {
      navigate('/dashboard');
    }
    // If there's an invitation, the useEffect above will handle accepting it
    
    setLoading(false);
  };

  const isSecretaryInvite = !!invitationToken;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isSecretaryInvite ? 'Convite de Secretário' : 'Criar Conta'}
          </CardTitle>
          <CardDescription>
            {isSecretaryInvite 
              ? 'Complete seu cadastro para acessar a clínica'
              : 'Preencha os dados para começar'
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isSecretaryInvite && invitationEmail && (
              <Alert className="bg-primary/10 border-primary/30">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  Você foi convidado para se juntar à clínica como secretário.
                  Use o email <strong>{invitationEmail}</strong> para completar o registro.
                </AlertDescription>
              </Alert>
            )}

            {!isSecretaryInvite && (
              <div className="space-y-3">
                <Label>Tipo de Acesso</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/50 cursor-pointer">
                    <RadioGroupItem value="profissional" id="profissional" />
                    <Label htmlFor="profissional" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Profissional</div>
                        <div className="text-xs text-muted-foreground">Acesso completo ao sistema</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/50 cursor-pointer opacity-60">
                    <RadioGroupItem value="secretario" id="secretario" disabled />
                    <Label htmlFor="secretario" className="flex items-center gap-3 cursor-pointer flex-1">
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold text-muted-foreground">Secretário</div>
                        <div className="text-xs text-muted-foreground">Requer convite de uma clínica</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {!isSecretaryInvite && role === 'profissional' && (
              <div className="space-y-2">
                <Label htmlFor="clinicName">Nome da Clínica</Label>
                <Input
                  id="clinicName"
                  type="text"
                  placeholder="Nome da sua clínica"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || (isSecretaryInvite && !!invitationEmail)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
              {password !== confirmPassword && confirmPassword.length > 0 && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{' '}
              <Link 
                to="/auth/login" 
                className="text-primary hover:underline font-medium"
              >
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}