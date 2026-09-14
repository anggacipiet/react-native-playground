# Build release Android gagal di Windows: ninja loop + path terlalu panjang

Catatan lengkap kenapa `npx expo run:android --variant release` (atau
`gradlew.bat app:assembleRelease`) gagal berkali-kali di Windows, dan
perbaikannya. Konteks: ini muncul waktu mencoba jawab pertanyaan "kenapa APK
debug stuck di splash kalau kabel USB dicabut" — jawabannya butuh build
**release** (JS bundle ter-embed di APK, tidak butuh Metro sama sekali), tapi
build release-nya sendiri gagal terus di Windows sampai 8 kali percobaan.

## Gejala 1: `ninja: error: manifest 'build.ninja' still dirty after 100 tries`

Muncul spesifik di `react-native-reanimated` (dan sempat sekali di
`expo-modules-core`), **hanya untuk build release** (`RelWithDebInfo`) — build
**debug** selalu sukses berkali-kali sepanjang project ini dikerjakan.

### Yang sudah dicoba tapi TIDAK memperbaiki

1. **Windows Defender exclusion** (`Add-MpPreference -ExclusionPath ...`) —
   sempat dicurigai karena pola errornya mirip bug ninja/antivirus yang
   pernah ditemui sebelumnya (lihat riwayat NDK di awal project). Tetap gagal
   identik setelah exclusion ditambahkan.
2. **Menghapus `CONFIGURE_DEPENDS`** dari `file(GLOB_RECURSE ...)` di
   `node_modules/react-native-reanimated/android/CMakeLists.txt` — `CONFIGURE_DEPENDS`
   memang dikenal rawan infinite-loop ninja di Windows karena bikin ninja
   terus "Re-checking globbed directories". Setelah dihapus, log ninja
   berubah (tidak ada lagi "Re-checking globbed directories"), tapi tetap
   loop di "Re-running CMake..." — jadi CONFIGURE_DEPENDS bukan akar
   masalah sebenarnya, cuma salah satu pemicu.
3. **Install CMake 3.31.6** (bawa ninja 1.12.1, lebih baru dari ninja 1.10.2
   bawaan CMake 3.22.1) lewat `sdkmanager` — tidak otomatis kepakai.
4. **Menonaktifkan CMake 3.22.1** (rename folder-nya) supaya AGP terpaksa
   pakai yang baru — TETAP kepakai versi lama (`CMakeCache.txt` menunjukkan
   `CMAKE_COMMAND` tetap mengarah ke path `3.22.1...`).

### Akar masalah sebenarnya

String **`"3.22.1"` ternyata hardcoded di dalam Android Gradle Plugin (AGP)
itu sendiri** sebagai versi CMake default (dibuktikan dengan ekstrak & grep
isi `gradle-8.12.0.jar` dari cache Gradle — string `3.22.1` ada literal di
dalamnya). AGP **tidak** otomatis memilih versi CMake tertinggi yang
terinstall di SDK — dia secara eksplisit meminta versi default hardcoded-nya
sendiri, kecuali di-override lewat DSL `externalNativeBuild { cmake { version = "..." } }`
di `build.gradle`/`build.gradle.kts` modul yang bersangkutan. Itu kenapa
install/hapus CMake di level SDK tidak berpengaruh sama sekali.

### Perbaikan yang berhasil

Tambahkan `version = "3.31.6"` secara eksplisit di
`node_modules/react-native-reanimated/android/build.gradle.kts`, pada blok
`android { externalNativeBuild { cmake { ... } } }` level-atas (BUKAN blok
`defaultConfig { externalNativeBuild { cmake { arguments(...) } } }` yang
cuma untuk flag build):

```kotlin
externalNativeBuild {
    cmake {
        path = file("CMakeLists.txt")
        version = "3.31.6"   // <- ditambahkan
    }
}
```

Setelah ini, error "still dirty after 100 tries" hilang total — reanimated
berhasil compile dengan ninja 1.12.1.

**Catatan:** ini patch ke `node_modules`, akan hilang kalau `npm install`
ulang. Kalau mau permanen, bungkus dengan `patch-package`
(`npx patch-package react-native-reanimated` setelah edit, lalu tambahkan
`postinstall: patch-package` di `package.json`).

## Gejala 2: `Filename longer than 260 characters`

Setelah gejala 1 beres, muncul error baru:

```
ninja: error: Stat(safeareacontext_autolinked_build/.../RNCSafeAreaViewShadowNode.cpp.o):
Filename longer than 260 characters
```

Ini limit **MAX_PATH Windows (260 karakter)**. Sudah kelihatan sebagai
*warning* (`CMAKE_OBJECT_PATH_MAX`) di HAMPIR SETIAP build sepanjang project
ini (baik debug maupun release), tapi baru jadi *error* keras untuk build
release — karena path folder build release (`.cxx\RelWithDebInfo\<hash>\...`)
sedikit lebih panjang dari debug (`.cxx\Debug\<hash>\...`), cukup untuk
melewati batas 260 karakter waktu digabung dengan path project yang memang
sudah panjang (`C:\Users\Asus\Documents\bhakti\react-native-expo-playground\...`).

`LongPathsEnabled=1` sudah aktif di registry Windows (dicek dari awal
project), tapi ninja tetap kena limit 260 karakter untuk beberapa
panggilan API internal (`Stat()`) yang tidak selalu menghormati long-path
opt-in itu.

### Perbaikan: directory junction ke path pendek

Daripada memindahkan folder project secara fisik (berisiko, dan gagal waktu
dicoba — ada proses yang mengunci foldernya), dibuat **directory junction**
(symlink direktori Windows) di path pendek yang menunjuk ke folder asli:

```powershell
mklink /J "C:\rn\react-native-expo-playground" "C:\Users\Asus\Documents\bhakti\react-native-expo-playground"
```

Build dijalankan **dari path junction** (`C:\rn\react-native-expo-playground\android`),
bukan dari path aslinya — Windows/CMake/ninja melihat path pendek ini secara
transparan (junction bukan symlink yang di-resolve balik ke path asli oleh
kebanyakan API file), sehingga total panjang path object file turun di
bawah 260 karakter. Build langsung sukses.

**Untuk build release berikutnya**, jalankan dari path junction ini:

```powershell
cd C:\rn\react-native-expo-playground\android
.\gradlew.bat app:assembleRelease -x lint -x test -PreactNativeArchitectures=arm64-v8a
```

(Ganti/hapus `-PreactNativeArchitectures=arm64-v8a` kalau butuh APK untuk
arsitektur lain juga — default project ini build ke 4 arsitektur sekaligus,
lebih lambat dan lebih rawan kena gejala 1 lagi kalau ninja versi lama masih
kepakai di modul lain.)

Junction ini murni pointer di level filesystem, tidak duplikasi data —
aman dihapus kapan saja (`rmdir C:\rn\react-native-expo-playground`, HATI-HATI
jangan pakai `/S` yang akan ikut menghapus isi folder asli lewat junction-nya).

## Hasil akhir

APK release (`android/app/build/outputs/apk/release/app-release.apk`) sudah
diverifikasi jalan standalone di device fisik — Metro/node sepenuhnya mati
(`netstat`/`tasklist` dicek kosong), app tetap render dan responsif terhadap
input. Ini konfirmasi jawaban dari pertanyaan awal: APK **debug** butuh
Metro/kabel karena JS bundle tidak ter-embed; APK **release** embed bundle-nya
langsung sehingga jalan tanpa kabel/Metro sama sekali — persis seperti APK
Flutter yang selalu compile Dart-nya ke dalam APK bahkan di mode debug.

Catatan: styling NativeWind/Tailwind belum tervalidasi tampil benar di build
release ini (layar sign-in terlihat tanpa style di screenshot verifikasi) —
kemungkinan berkaitan dengan bagaimana NativeWind memproses CSS di build
release vs debug. Belum diinvestigasi lebih lanjut, di luar scope perbaikan
ini.
