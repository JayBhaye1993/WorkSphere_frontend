# WorkSphere on Android and iOS (Capacitor)

The phone apps wrap the same Angular app as web and desktop. Every screen is built once.

## One-time setup (Windows, Android)
1. Install **Android Studio** (Ladybug 2024.2 or newer). It brings its own Java (JDK 21) and the Android SDK.
2. In Android Studio: *More Actions → Virtual Device Manager → Create device* (e.g. Pixel 7, Android 14).

## Build and run
```powershell
cd C:\Projects\WorkSphere_frontend\web
npm run mobile:sync      # ng build --configuration mobile, then copy into android/
npm run mobile:android   # opens the project in Android Studio; press Run
```
Run `npm run mobile:sync` again after every web change.

## Which API the app uses
`src/environments/environment.mobile.ts`:
- Android emulator: `http://10.0.2.2:5010` (10.0.2.2 is your PC from inside the emulator). Default.
- Real phone on the same Wi-Fi: your PC's address, e.g. `http://192.168.1.20:5010`, and the gateway must listen on the network, not only on localhost.
- Production: the public https address; then remove `cleartext: true` from `capacitor.config.ts`.

## Phone behaviour (src/app/core/native/native-shell.ts)
- Android back button goes back one screen; on Home, Tasks, People, Time off or More it closes the app.
- Status bar: dark text on white. Safe areas (notches, gesture bar) are respected by the layout.

## iOS
Needs a Mac with Xcode: `npx cap add ios`, then `npm run mobile:sync` and `npx cap open ios`.
