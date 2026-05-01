import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.micromeasurements.transcalc',
  appName: 'Transcalc',
  webDir: 'dist',
  server: {
    // During development, point to the Vite dev server on your machine's LAN IP.
    // Comment this out for production builds (App Store / Play Store release).
    // url: 'http://192.168.5.50:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1a2636',
  },
  android: {
    backgroundColor: '#1a2636',
  },
}

export default config
