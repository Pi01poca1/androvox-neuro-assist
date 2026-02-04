import { useState, useRef, useEffect } from 'react';
import { Shield, Key, Wifi, Settings as SettingsIcon, Lock, Unlock, Users, Database, Image, AlertTriangle } from 'lucide-react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { OfflineSyncIndicator } from '@/components/offline/OfflineSyncIndicator';
import { InstallPWA } from '@/components/offline/InstallPWA';
import { LocalTeamManagement } from '@/components/settings/LocalTeamManagement';
import { BackupManager } from '@/components/backup/BackupManager';
import { AccountDangerZone } from '@/components/settings/AccountDangerZone';
import { getClinicById, updateClinic, type LocalClinic } from '@/lib/localDb';

export default function SettingsPage() {
  const { privacyMode, usbStatus, isOnline, setPrivacyMode, checkUsbKey } = usePrivacyMode();
  const { userRole, clinicId } = useAuth();
  const { toast } = useToast();
  const [isSimulatingUsb, setIsSimulatingUsb] = useState(false);
  const isProfessional = userRole === 'profissional';
  
  // Clinic settings
  const [clinic, setClinic] = useState<LocalClinic | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clinicId) {
      getClinicById(clinicId).then(c => {
        if (c) {
          setClinic(c);
          setClinicName(c.name);
          setLogoPreview(c.logo_data || null);
        }
      });
    }
  }, [clinicId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 2MB', variant: 'destructive' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClinicSettings = async () => {
    if (!clinicId) return;
    
    setIsSavingClinic(true);
    try {
      await updateClinic(clinicId, {
        name: clinicName,
        logo_data: logoPreview,
      });
      toast({ title: 'Configurações salvas!', description: 'As alterações foram aplicadas.' });
    } catch (error) {
      console.error('Error saving clinic settings:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSavingClinic(false);
    }
  };

  const handleToggleUsbKey = () => {
    setIsSimulatingUsb(true);
    
    if (usbStatus === 'present') {
      localStorage.removeItem('androvox_usb_key');
      toast({
        title: "Chave USB removida",
        description: "Chave de segurança desconectada do sistema.",
        variant: "default",
      });
    } else {
      const timestamp = new Date().toISOString();
      const mockKey = `usb_key_${timestamp}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('androvox_usb_key', mockKey);
      toast({
        title: "Chave USB inserida",
        description: "Chave de segurança conectada com sucesso.",
        variant: "default",
      });
    }
    
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

      <InstallPWA />

      <Tabs defaultValue={isProfessional ? "clinic" : "security"} className="w-full">
        <TabsList className={`grid w-full ${isProfessional ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {isProfessional && (
            <TabsTrigger value="clinic">
              <Image className="h-4 w-4 mr-2" />
              Consultório
            </TabsTrigger>
          )}
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
          {isProfessional && (
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="danger">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conta
          </TabsTrigger>
        </TabsList>

        {/* Clinic Settings Tab */}
        {isProfessional && (
          <TabsContent value="clinic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>
                  Configure o nome e logo do seu consultório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nome do Consultório</Label>
                  <Input
                    id="clinicName"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Nome do consultório"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo do Consultório</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain rounded-lg border bg-background"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
                      </Button>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setLogoPreview(null)}
                          className="text-destructive"
                        >
                          Remover
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
                    </div>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>

                <Separator />

                <Button onClick={handleSaveClinicSettings} disabled={isSavingClinic}>
                  {isSavingClinic ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="security" className="space-y-6 mt-6">
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

          <OfflineSyncIndicator />
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="mt-6">
          <BackupManager />
        </TabsContent>

        {isProfessional && (
          <TabsContent value="team" className="mt-6">
            <LocalTeamManagement />
          </TabsContent>
        )}

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="mt-6">
          <AccountDangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
