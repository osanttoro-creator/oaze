import type { CapacitorConfig } from '@capacitor/cli';

// appId proposto; confirmar antes de criar os apps nas lojas (não dá para trocar depois).
const config: CapacitorConfig = {
  appId: 'site.oaze.app',
  appName: 'OAZE',
  webDir: 'dist-live',
  backgroundColor: '#1C3340',
  /* 16/11/2026: o projeto Android mora em "app android", na raiz, ao lado
     do núcleo comum (app) e do Windows (app desktop). */
  android: { path: '../app android', allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'never', scheme: 'OAZE', limitsNavigationsToAppBoundDomains: true },
  plugins: {
    LocalNotifications: { iconColor: '#5FA99B' },
    PrivacyScreen: { enable: true },
  },
};

export default config;
