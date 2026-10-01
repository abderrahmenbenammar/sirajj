import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.seeradj.app',
  appName: 'siraj',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.2:3000',
    cleartext: true
  }
};

export default config;
