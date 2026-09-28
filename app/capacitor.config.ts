import type { CapacitorConfig } from '@capacitor/cli';

// appId proposto; confirmar antes de criar os apps nas lojas (não dá para trocar depois).
const config: CapacitorConfig = {
  appId: 'site.oaze.app',
  appName: 'OAZE',
  webDir: 'dist',
  backgroundColor: '#0D1821',
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'never', scheme: 'OAZE', limitsNavigationsToAppBoundDomains: true },
  plugins: {
    LocalNotifications: { iconColor: '#5FA99B' },
    PrivacyScreen: { enable: true },
  },
};

export default config;
