# Debug pakai React Native DevTools

Catatan cara buka & pakai React Native DevTools untuk project ini (Expo dev
client + Hermes, tested di device fisik OPPO CPH2473 lewat USB).

## Buka DevTools

Syarat: `npx expo run:android` (atau `npx expo start`) sedang jalan dan
device sudah terhubung (`adb devices` menampilkan device-nya, `adb reverse
tcp:8081 tcp:8081` sudah otomatis di-setup oleh Expo CLI).

Ada beberapa cara membukanya:

1. **Dari terminal Metro** — tekan `j` di terminal tempat `expo start` /
   `expo run:android` berjalan. Ini langsung membuka jendela React Native
   DevTools (judulnya persis seperti `react-native-expo-playground (OPPO
   CPH2473) - React Native Dev Tools`).
2. **Dari dev menu di device** — shake device (atau `adb shell input keyevent
   82` buat trigger dev menu tanpa shake fisik), lalu pilih **"Open DevTools"**
   / **"Open debugger"**.
3. **Dari terminal, tanpa buka Metro interaktif** — `npx expo start` lalu
   tekan `j`, sama seperti di atas.

DevTools ini beda dari Chrome DevTools lama (`chrome://inspect`) — ini
sudah versi baru bawaan React Native (Fusebox/CDT berbasis Hermes), jadi
breakpoint & source map langsung nyambung ke file `.ts`/`.tsx` asli tanpa
setup tambahan.

## Panel yang tersedia

- **Console** — semua `console.log`/`console.error`/`console.warn` dari JS
  muncul di sini secara real-time. Ini yang dipakai waktu debugging bug MSW
  (lihat [`msw-native-bug.md`](./msw-native-bug.md)) — `console.error` di
  `useTodos` dan debug log sementara di `apiFetch` semuanya kelihatan di
  panel ini, bukan cuma di in-app LogBox.
- **Sources** — bisa taruh breakpoint langsung di source asli (mis.
  `src/hooks/use-todos.ts`, `src/api/client.ts`). Reload app abis pasang
  breakpoint kalau breakpoint dipasang sebelum kode itu sempat jalan.
- **Network** *(terbatas)* — request lewat `fetch`/XHR bisa muncul, tapi
  karena project ini pakai MSW (`msw/native`) buat mock semua request,
  request yang di-mock **tidak selalu numpang lewat native networking
  layer**, jadi kadang tidak muncul di tab ini. Untuk ngecek response body
  hasil mock, lebih reliable pakai `console.log` manual di `apiFetch` atau
  cek langsung dari Console panel.
- **React DevTools (Components / Profiler)** — kalau versi DevTools yang
  kepasang sudah include React DevTools terintegrasi, bisa inspect component
  tree, props/state, dan render performance langsung dari sini juga.

## Alternatif kalau device tidak connect ke DevTools

Kalau `j` di Metro tidak membuka apa-apa (device belum ke-detect sebagai dev
client, atau koneksi ke Metro putus), debug manual lewat `adb logcat` masih
kepakai — dipakai juga waktu investigasi bug splash screen & MSW:

```bash
# device id dari `adb devices`
adb -s <device_id> logcat -c                     # clear buffer
adb -s <device_id> logcat -d -v time ReactNativeJS:V AndroidRuntime:E *:S
```

Ini nangkep `console.log`/`console.error` dari JS (tag `ReactNativeJS`) dan
crash native (tag `AndroidRuntime`) tanpa perlu DevTools sama sekali —
berguna kalau lagi debug crash yang terjadi sebelum JS sempat konek ke
Metro/DevTools (mis. error yang bikin splash screen stuck).

## Tips spesifik project ini

- Karena `src/mocks/server.ts` (MSW) di-load lewat `index.js` cuma pas
  `__DEV__`, breakpoint di handler mock (`src/mocks/handlers.ts`) juga bisa
  kena kalau dipasang di Sources panel — berguna buat ngecek apakah suatu
  request benar-benar match handler atau lewat begitu saja
  (`onUnhandledRequest: 'warn'` bakal nge-log warning di Console kalau
  request tidak ada handler-nya).
- Reload app dari DevTools (atau shake → Reload) **tidak selalu ambil
  bundle baru** kalau ada perubahan di `index.js` / entry-level polyfill —
  kadang perlu force-stop app dulu (`adb shell am force-stop <package>`)
  baru buka lagi biar bundle-nya benar-benar fresh dari Metro.
