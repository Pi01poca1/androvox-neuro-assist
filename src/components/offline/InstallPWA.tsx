import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  if (!showInstallBanner) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Instalar Aplicativo</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstallBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Instale o Androvox Assist no seu dispositivo para acesso rápido e uso offline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Benefícios:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Acesso rápido direto da tela inicial
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Funciona offline com sincronização automática
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Experiência nativa de aplicativo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Notificações e atualizações automáticas
              </li>
            </ul>
          </div>
          
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Instalar Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
