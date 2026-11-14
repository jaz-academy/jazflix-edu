import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jazflix.tv',
  appName: 'Jazflix',
  webDir: 'public',
  server: {
    // Mengarah ke server Next.js lokal di laptop Anda (IP: 192.168.1.121:3000)
    // Otomatis mengaktifkan ?tv=1 agar TV Mode & D-pad focus aktif
    url: process.env.CAPACITOR_SERVER_URL || 'https://jazflix-edu.vercel.app?tv=1',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
