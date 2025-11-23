import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import type { PrivacyMode, UsbKeyStatus, SecurityContextType } from '@/types/security';
import { useToast } from '@/hooks/use-toast';

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState<PrivacyMode>('ID');
  const [usbStatus, setUsbStatus] = useState<UsbKeyStatus>('absent');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check USB key status (simulated for web version)
  const checkUsbKey = async (): Promise<UsbKeyStatus> => {
    // In a real implementation with Electron, this would check for actual USB device
    // For now, we simulate it with localStorage
    const storedKey = localStorage.getItem('androvox_usb_key');
    const status: UsbKeyStatus = storedKey ? 'present' : 'absent';
    setUsbStatus(status);
    return status;
  };

  // Check USB status on mount
  useEffect(() => {
    checkUsbKey();
  }, []);

  const setPrivacyMode = async (mode: PrivacyMode): Promise<boolean> => {
    // If trying to switch to NOME mode, check conditions
    if (mode === 'NOME') {
      const currentUsbStatus = await checkUsbKey();
      
      // Require USB key for NOME mode
      if (currentUsbStatus !== 'present') {
        toast({
          title: "Chave USB necessária",
          description: "Para trabalhar com nomes de pacientes, conecte a chave USB de segurança.",
          variant: "destructive",
        });
        return false;
      }

      // Show risk warning if online
      if (isOnline) {
        const confirmed = window.confirm(
          "⚠️ AVISO DE SEGURANÇA\n\n" +
          "Trabalhar com NOMES DE PACIENTES no modo online aumenta o risco de exposição de dados sensíveis.\n\n" +
          "Recomendamos usar apenas o MODO ID para maior segurança.\n\n" +
          "Deseja prosseguir mesmo assim?"
        );
        
        if (!confirmed) {
          return false;
        }
      }
    }

    setPrivacyModeState(mode);
    localStorage.setItem('androvox_privacy_mode', mode);
    
    toast({
      title: `Modo ${mode} ativado`,
      description: mode === 'ID' 
        ? "Trabalhando apenas com IDs - maior segurança"
        : "Trabalhando com nomes - atenção à privacidade",
      variant: mode === 'ID' ? 'default' : 'default',
    });

    return true;
  };

  const value: SecurityContextType = {
    privacyMode,
    usbStatus,
    isOnline,
    setPrivacyMode,
    checkUsbKey,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function usePrivacyMode() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a SecurityProvider');
  }
  return context;
}
