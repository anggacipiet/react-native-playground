# Menjalankan di Device Asli

Panduan ini setara dengan workflow `flutter run` (compile + hot reload di HP fisik), disesuaikan untuk project Expo ini. Ada 3 level tergantung kebutuhan.

## 1. Paling cepat — Expo Go (tanpa compile native)

Cocok dipakai di project ini karena semua library yang dipakai (`react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, MSW + polyfill) sudah didukung oleh Expo Go SDK 57 — tidak ada native module custom yang butuh dev build.

```bash
cd react-native-expo-playground
npm start
```

Langkah:
1. Install app **Expo Go** dari Play Store (Android) / App Store (iOS) di HP.
2. Pastikan laptop & HP satu jaringan WiFi, lalu scan QR code yang muncul di terminal (Android: pakai fitur scan di dalam app Expo Go; iOS: pakai app Camera bawaan).
3. Kalau HP & laptop tidak bisa satu jaringan (WiFi kampus/kantor yang isolasi device, hotspot berbeda, dsb): jalankan `npx expo start --tunnel` sebagai gantinya.
4. Edit kode → save → otomatis **Fast Refresh** (setara hot reload di Flutter), langsung update di HP tanpa compile ulang.

Catatan: app jalan *di dalam* aplikasi Expo Go, bukan sebagai app native berdiri sendiri.

## 2. Setara persis `flutter run` — compile native lokal + install ke device

Dipakai kalau butuh app native sendiri (bukan di dalam Expo Go), atau nanti sudah pakai native module yang tidak didukung Expo Go.

Prasyarat: Android SDK + adb (biasanya sudah terpasang lewat Android Studio, contoh lokasi umum di Windows: `%LOCALAPPDATA%\Android\Sdk`). Pastikan `adb` bisa dipanggil dari terminal (ada di PATH, atau `ANDROID_HOME` / `ANDROID_SDK_ROOT` sudah di-set).

```bash
# 1. Aktifkan "USB debugging" di HP (Settings > Developer options)
# 2. Colok HP via kabel USB, izinkan dialog "Allow USB debugging" di HP
adb devices              # pastikan device muncul di list, statusnya "device" bukan "unauthorized"

cd react-native-expo-playground
npx expo run:android
```

Yang terjadi:
- Compile project native Android via Gradle (build pertama agak lama, build berikutnya lebih cepat karena incremental).
- APK hasil compile langsung ke-install ke HP yang terdeteksi `adb`.
- App terbuka sendiri (bukan lewat Expo Go), tapi tetap connect ke Metro bundler — edit & save kode tetap Fast Refresh seperti biasa.

Untuk iOS: perintahnya `npx expo run:ios`, tapi **wajib macOS + Xcode** — tidak bisa dijalankan dari Windows. Kalau perlu test di iOS tanpa Mac, lihat opsi 3 (EAS Build cloud).

## 3. Build APK installable (mirip `flutter build apk`)

Untuk menghasilkan file APK yang bisa diinstall manual / dibagikan ke tester tanpa perlu laptop & Metro menyala:

```bash
npx eas login                              # sekali saja, pakai akun Expo
npx eas build -p android --profile preview
```

Build dijalankan di cloud (EAS Build), setelah selesai akan dapat link download APK. Bisa langsung dibuka dari HP untuk diinstall, atau `adb install nama-file.apk` dari laptop.

## Rekomendasi

- **Development sehari-hari:** opsi 1 (Expo Go) — paling cepat untuk iterasi.
- **Kalau sudah pakai native module di luar Expo Go, atau butuh app native berdiri sendiri:** opsi 2 (`npx expo run:android`).
- **Untuk dibagikan ke orang lain / testing tanpa setup dev environment:** opsi 3 (EAS Build).
