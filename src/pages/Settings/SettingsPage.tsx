import { useState } from 'react';
import { Shield, Key, Wifi, Settings as SettingsIcon, Lock, Unlock } from 'lucide-react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { OfflineSyncIndicator } from '@/components/offline/OfflineSyncIndicator';
import { InstallPWA } from '@/components/offline/InstallPWA';

export default function SettingsPage() {
  const { privacyMode, usbStatus, isOnline, setPrivacyMode, checkUsbKey } = usePrivacyMode();
  const { toast } = useToast();
  const [isSimulatingUsb, setIsSimulatingUsb] = useState(false);

  const handleToggleUsbKey = () => {
    setIsSimulatingUsb(true);
    
    if (usbStatus === 'present') {
      // Remove USB key
      localStorage.removeItem('androvox_usb_key');
      toast({
        title: "Chave USB removida",
        description: "Chave de segurança desconectada do sistema.",
        variant: "default",
      });
    } else {
      // Insert USB key
      const timestamp = new Date().toISOString();
      const mockKey = `usb_key_${timestamp}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('androvox_usb_key', mockKey);
      toast({
        title: "Chave USB inserida",
        description: "Chave de segurança conectada com sucesso.",
        variant: "default",
      });
    }
    
    // Refresh USB status
    setTimeout(() => {
      checkUsbKey();
      setIsSimulatingUsb(false);
    }, 500);
  };

  const handleTogglePrivacyMode = async () => {
    const newMode = privacyMode === 'ID' ? 'NOME' : 'ID';
    await setPrivacyMode(newMode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações de segurança, privacidade e sincronização do sistema
        </p>
      </div>

      {/* Install PWA Banner */}
      <InstallPWA />

      {/* Privacy Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Modo de Privacidade
          </CardTitle>
          <CardDescription>
            Controle como os dados dos pacientes são exibidos no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Modo Atual</Label>
              <p className="text-sm text-muted-foreground">
                {privacyMode === 'ID' 
                  ? 'Trabalhando com IDs públicos (máxima segurança)'
                  : 'Trabalhando com nomes de pacientes (requer offline + USB)'}
              </p>
            </div>
            <Badge 
              variant={privacyMode === 'ID' ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {privacyMode === 'ID' ? (
                <><Lock className="h-4 w-4 mr-2" /> MODO ID</>
              ) : (
                <><Unlock className="h-4 w-4 mr-2" /> MODO NOME</>
              )}
            </Badge>
          </div>

          <Separator />

          <Button 
            onClick={handleTogglePrivacyMode}
            variant={privacyMode === 'ID' ? 'default' : 'outline'}
            className="w-full"
          >
            Alternar para Modo {privacyMode === 'ID' ? 'NOME' : 'ID'}
          </Button>
        </CardContent>
      </Card>

      {/* USB Key Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Chave USB de Segurança
          </CardTitle>
          <CardDescription>
            Simule a conexão/desconexão da chave USB de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Status da Chave</Label>
              <p className="text-sm text-muted-foreground">
                {usbStatus === 'present' 
                  ? 'Chave USB conectada e autorizada'
                  : 'Nenhuma chave USB detectada no sistema'}
              </p>
            </div>
            <Badge 
              variant={usbStatus === 'present' ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              <Key className="h-4 w-4 mr-2" />
              {usbStatus === 'present' ? 'CONECTADA' : 'AUSENTE'}
            </Badge>
          </div>

          <Separator />

          <Button 
            onClick={handleToggleUsbKey}
            disabled={isSimulatingUsb}
            variant={usbStatus === 'present' ? 'destructive' : 'default'}
            className="w-full"
          >
            {usbStatus === 'present' ? 'Remover Chave USB' : 'Inserir Chave USB'}
          </Button>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">ℹ️ Sobre a Chave USB:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Necessária para visualizar nomes de pacientes</li>
              <li>Deve estar presente junto com modo offline</li>
              <li>Simulada nesta versão web do sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Status da Conexão
          </CardTitle>
          <CardDescription>
            Monitoramento do status de conectividade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Conectividade</Label>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Sistema conectado à internet'
                  : 'Sistema operando em modo offline (mais seguro para dados identificáveis)'}
              </p>
            </div>
            <Badge 
              variant={isOnline ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {isOnline ? (
                <><Wifi className="h-4 w-4 mr-2" /> ONLINE</>
              ) : (
                <><Wifi className="h-4 w-4 mr-2" /> OFFLINE</>
              )}
            </Badge>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">⚠️ Recomendações de Segurança:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use Modo ID quando estiver online</li>
              <li>Use Modo NOME apenas offline + com USB</li>
              <li>Desconecte da internet para máxima segurança</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Security Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Resumo de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Modo de Privacidade:</span>
              <Badge variant={privacyMode === 'ID' ? 'default' : 'secondary'}>
                {privacyMode}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Chave USB:</span>
              <Badge variant={usbStatus === 'present' ? 'default' : 'secondary'}>
                {usbStatus === 'present' ? 'Presente' : 'Ausente'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conexão:</span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nomes Visíveis:</span>
              <Badge variant={privacyMode === 'NOME' && usbStatus === 'present' && !isOnline ? 'default' : 'secondary'}>
                {privacyMode === 'NOME' && usbStatus === 'present' && !isOnline ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Sync Card */}
      <OfflineSyncIndicator />
    </div>
  );
}
