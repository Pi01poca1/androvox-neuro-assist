import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Download,
  Upload,
  RefreshCw,
  FolderSync,
  HardDrive,
  Cloud,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  downloadBackup,
  importBackup,
  downloadSyncPackage,
  importSyncPackage,
  getAutoBackupSettings,
  setAutoBackupSettings,
} from '@/lib/backupService';

export function BackupManager() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoBackupSettings, setAutoBackupSettingsState] = useState(getAutoBackupSettings());

  const handleDownloadBackup = async () => {
    if (!clinicId) return;
    
    setIsExporting(true);
    try {
      await downloadBackup(clinicId);
      toast({
        title: 'Backup exportado!',
        description: 'O arquivo de backup foi baixado para seu computador.',
      });
    } catch (error) {
      console.error('Error exporting backup:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível criar o backup.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const result = await importBackup(file);
      if (result.success) {
        toast({
          title: 'Backup importado!',
          description: `${result.imported?.patients || 0} pacientes e ${result.imported?.sessions || 0} sessões importados.`,
        });
      } else {
        toast({
          title: 'Erro na importação',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing backup:', error);
      toast({
        title: 'Erro ao importar',
        description: 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportSync = async () => {
    if (!clinicId) return;
    
    setIsSyncing(true);
    try {
      await downloadSyncPackage(clinicId);
      toast({
        title: 'Pacote de sincronização criado!',
        description: 'Salve o arquivo na pasta compartilhada (Dropbox, Google Drive, etc.)',
      });
    } catch (error) {
      console.error('Error exporting sync:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível criar o pacote de sincronização.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;
    
    setIsSyncing(true);
    try {
      const result = await importSyncPackage(file, clinicId);
      if (result.success) {
        toast({
          title: 'Sincronização concluída!',
          description: `${result.synced?.patients || 0} pacientes e ${result.synced?.sessions || 0} sessões sincronizados.`,
        });
      } else {
        toast({
          title: 'Erro na sincronização',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing sync:', error);
      toast({
        title: 'Erro ao sincronizar',
        description: 'Não foi possível processar o pacote.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      if (syncInputRef.current) {
        syncInputRef.current.value = '';
      }
    }
  };

  const handleAutoBackupChange = (enabled: boolean) => {
    const newSettings = { ...autoBackupSettings, enabled };
    setAutoBackupSettings(newSettings);
    setAutoBackupSettingsState(newSettings);
    toast({
      title: enabled ? 'Backup automático ativado' : 'Backup automático desativado',
    });
  };

  const handleIntervalChange = (value: string) => {
    const newSettings = { ...autoBackupSettings, intervalHours: parseInt(value) };
    setAutoBackupSettings(newSettings);
    setAutoBackupSettingsState(newSettings);
  };

  return (
    <div className="space-y-6">
      {/* Download Local */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Backup Local
          </CardTitle>
          <CardDescription>
            Baixe um arquivo com todos os seus dados para guardar onde quiser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadBackup} disabled={isExporting || !clinicId}>
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Baixar Backup
            </Button>
            
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Restaurar Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sincronização via Pasta Compartilhada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderSync className="h-5 w-5 text-primary" />
            Sincronização via Pasta Compartilhada
          </CardTitle>
          <CardDescription>
            Sincronize dados entre profissional e secretário usando Dropbox, Google Drive ou pasta local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Como funciona:</strong> Exporte o pacote de sincronização e salve na pasta compartilhada. 
              O outro usuário importa o arquivo da mesma pasta para receber os dados atualizados.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportSync} disabled={isSyncing || !clinicId} variant="default">
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Exportar para Sincronizar
            </Button>
            
            <Button variant="outline" onClick={() => syncInputRef.current?.click()} disabled={isSyncing}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Sincronização
            </Button>
            <input
              ref={syncInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSync}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Backup Automático
          </CardTitle>
          <CardDescription>
            Configure lembretes periódicos para fazer backup dos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar lembrete de backup</Label>
              <p className="text-sm text-muted-foreground">
                Receba um aviso quando estiver na hora de fazer backup
              </p>
            </div>
            <Switch
              checked={autoBackupSettings.enabled}
              onCheckedChange={handleAutoBackupChange}
            />
          </div>
          
          {autoBackupSettings.enabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Intervalo entre backups</Label>
                <Select
                  value={autoBackupSettings.intervalHours.toString()}
                  onValueChange={handleIntervalChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">A cada 12 horas</SelectItem>
                    <SelectItem value="24">A cada 24 horas</SelectItem>
                    <SelectItem value="48">A cada 2 dias</SelectItem>
                    <SelectItem value="168">A cada semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {autoBackupSettings.lastBackupAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Último backup: {new Date(autoBackupSettings.lastBackupAt).toLocaleString('pt-BR')}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Google Drive (Futuro) */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-muted-foreground" />
            Google Drive
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Em breve</span>
          </CardTitle>
          <CardDescription>
            Conecte sua conta Google para backup automático na nuvem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline">
            <Cloud className="mr-2 h-4 w-4" />
            Conectar Google Drive
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
