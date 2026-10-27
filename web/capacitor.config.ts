import type { CapacitorConfig } from '@capacitor/cli';

// The Android and iOS apps wrap the same Angular build as web and desktop.
// Build with:  npm run mobile:sync   (ng build --configuration mobile, then cap sync)
const config: CapacitorConfig = {
  appId: 'in.worksphere.app',
  appName: 'WorkSphere',
  webDir: 'dist/web/browser',
  server: {
    androidScheme: 'https',
    // Development only: the local gateway is plain http. Remove when the API is served over https.
    cleartext: true,
  },
  android: { allowMixedContent: true },
};

export default config;
