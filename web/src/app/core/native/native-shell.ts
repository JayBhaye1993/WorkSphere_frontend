import { Location } from '@angular/common';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';

/** Top-level screens: from here the Android back button leaves the app instead of going back. */
const ROOTS = ['/home', '/tasks', '/people', '/time-off', '/more', '/auth/login'];

/**
 * Phone behaviour for the Android / iOS apps. Does nothing on web and desktop.
 * - Android back button: back one screen; on a top-level screen, close the app.
 * - Status bar: dark text on white, matching the app header.
 */
export function initNativeShell(): () => Promise<void> {
  const router = inject(Router);
  const location = inject(Location);
  return async () => {
    if (!Capacitor.isNativePlatform()) return;
    const [{ App }, { StatusBar, Style }] = await Promise.all([import('@capacitor/app'), import('@capacitor/status-bar')]);
    App.addListener('backButton', () => {
      const path = router.url.split('?')[0];
      if (ROOTS.includes(path)) void App.exitApp();
      else location.back();
    });
    try {
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === 'android') await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch { /* not supported on this device */ }
  };
}
