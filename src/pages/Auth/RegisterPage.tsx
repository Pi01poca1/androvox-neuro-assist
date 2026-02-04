import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Briefcase, WifiOff, Info, Upload, X, Image } from 'lucide-react';
import type { AppRole } from '@/types/roles';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Convert ArrayBuffer to Base64 in chunks to avoid stack overflow
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192; // Process 8KB at a time
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }

    return btoa(binary);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return;
    }
    
    // Max size 2MB
    if (file.size > 2 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return;
    }

    try {
      // Read file as ArrayBuffer and convert to base64 in chunks
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type;
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log('Logo processed successfully, size:', dataUrl.length);
      setLogoPreview(dataUrl);
      setLogoData(dataUrl);
    } catch (error) {
      console.error('Error processing logo:', error);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      'profissional' as AppRole,
      clinicName,
      logoData
    );
    
    if (!error) {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para começar
          </CardDescription>
          <Badge variant="secondary" className="mx-auto gap-1.5">
            <WifiOff className="h-3 w-3" />
            Modo Offline
          </Badge>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert className="bg-muted border-border">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Modo Offline:</strong> Todos os dados são armazenados localmente no seu dispositivo.
                Para adicionar secretários, use o menu Configurações após criar sua conta.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label>Tipo de Acesso</Label>
              <div className="flex items-center space-x-3 rounded-lg border border-primary bg-primary/5 p-4">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Profissional</div>
                  <div className="text-xs text-muted-foreground">Acesso completo ao sistema</div>
                </div>
              </div>
            </div>
            
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

            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome do Consultório</Label>
              <Input
                id="clinicName"
                type="text"
                placeholder="Nome do seu consultório"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo do Consultório (opcional)</Label>
              {logoPreview ? (
                <div className="relative w-full">
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-background">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain rounded-md border"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logo carregada</p>
                      <p className="text-xs text-muted-foreground">Clique no X para remover</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeLogo}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Clique para enviar logo</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
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
