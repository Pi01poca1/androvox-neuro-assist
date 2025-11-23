export type PrivacyMode = 'ID' | 'NOME';
export type UsbKeyStatus = 'absent' | 'present' | 'locked' | 'error';

export interface PrivacySettings {
  mode: PrivacyMode;
  usbStatus: UsbKeyStatus;
  isOnline: boolean;
  showRiskWarning: boolean;
}

export interface SecurityContextType {
  privacyMode: PrivacyMode;
  usbStatus: UsbKeyStatus;
  isOnline: boolean;
  setPrivacyMode: (mode: PrivacyMode) => Promise<boolean>;
  checkUsbKey: () => Promise<UsbKeyStatus>;
}
