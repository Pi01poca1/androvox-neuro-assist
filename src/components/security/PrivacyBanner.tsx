import { AlertTriangle, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function PrivacyBanner() {
  const { privacyMode, usbStatus, isOnline, showNames } = usePrivacyMode();

  // Banner crítico: Modo Nome + Online (alto risco)
  if (privacyMode === 'NOME' && isOnline) {
    return (
      <Alert variant="destructive" className="border-warning bg-warning/10">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-bold">⚠️ AVISO DE SEGURANÇA CRÍTICO</AlertTitle>
        <AlertDescription className="text-warning/90">
          Você está em <strong>Modo NOME</strong> enquanto <strong>ONLINE</strong>. 
          Dados identificáveis de pacientes estão em risco de exposição. 
          Para máxima segurança, desconecte-se da internet ou retorne ao Modo ID.
        </AlertDescription>
      </Alert>
    );
  }

  // Banner de aviso: Modo Nome + Offline mas sem USB
  if (privacyMode === 'NOME' && !isOnline && usbStatus !== 'present') {
    return (
      <Alert variant="default" className="border-warning/50 bg-warning/5">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-semibold">Chave USB Necessária</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Modo NOME ativado, mas a chave USB de segurança não está presente. 
          Insira a chave USB para visualizar nomes de pacientes.
        </AlertDescription>
      </Alert>
    );
  }

  // Banner de sucesso: Modo Nome + Offline + USB (configuração segura)
  if (privacyMode === 'NOME' && !isOnline && usbStatus === 'present') {
    return (
      <Alert variant="default" className="border-success bg-success/10">
        <Shield className="h-5 w-5 text-success" />
        <AlertTitle className="text-success font-semibold">
          <CheckCircle2 className="h-4 w-4 inline mr-1" />
          Modo Seguro Ativado
        </AlertTitle>
        <AlertDescription className="text-success/80">
          Sistema operando em máxima segurança: Offline + USB presente. 
          Nomes de pacientes visíveis apenas neste dispositivo.
        </AlertDescription>
      </Alert>
    );
  }

  // Banner informativo: Modo ID (sempre seguro)
  if (privacyMode === 'ID') {
    return (
      <Alert variant="default" className="border-primary/30 bg-primary/5">
        <Shield className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-semibold">Modo ID Ativo</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Trabalhando com IDs públicos. Nomes de pacientes ocultos para máxima privacidade.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
