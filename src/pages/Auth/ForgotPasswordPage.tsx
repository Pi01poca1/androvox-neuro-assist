import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, WifiOff, Info, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Modo Offline
          </CardDescription>
          <Badge variant="secondary" className="mx-auto gap-1.5">
            <WifiOff className="h-3 w-3" />
            Modo Offline
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted border-border">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Recuperação de senha offline:</strong>
              <p className="mt-2">
                Como o sistema funciona em modo offline, a recuperação de senha por email não está disponível.
              </p>
              <p className="mt-2">
                Para redefinir sua senha, entre em contato com o administrador do sistema ou outro profissional com acesso administrativo.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
