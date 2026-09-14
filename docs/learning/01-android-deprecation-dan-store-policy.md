# Deprecation Android & kebijakan Play Store / App Store

Catatan riset (September 2026) — bukan hasil coding, murni untuk pemahaman.

## 1. Target API level Google Play

**Sudah berlaku sejak 31 Agustus 2025:** app baru dan update app wajib target **Android 15 (API level 35)** atau lebih tinggi.

**Deadline berikutnya — 31 Agustus 2026 (dekat sekali dari sekarang):** app baru dan update wajib target **Android 16 (API level 36)** atau lebih tinggi. Bisa minta perpanjangan sampai **1 November 2026**. App lama yang belum di-update tetap bisa diinstall ulang oleh user lama, tapi **tidak akan muncul untuk user baru** yang device-nya menjalankan versi Android lebih baru dari target app itu — jangkauan app makin menyempit seiring waktu kalau dibiarkan.

**Siklusnya:** Google menaikkan requirement ini kira-kira setahun sekali, mengikuti rilis Android tahunan (requirement biasanya ~1 tahun di belakang versi Android terbaru).

**Pengecualian form-factor:** Wear OS & Android Automotive OS wajib target API 35; Android TV & Android XR wajib target API 34 (satu siklus di belakang HP/tablet).

**`compileSdkVersion` vs `targetSdkVersion`:** `compileSdkVersion` cuma menentukan API mana yang tersedia saat build (naikkan compileSdk umumnya aman, tidak mengubah behavior runtime). `targetSdkVersion` yang benar-benar dicek Google Play, dan inilah yang mengubah **behavior runtime app** (model permission, background restriction, dll — semua opt-in per versi Android). Play policy check target, bukan compile.

**Status project ini:** `compileSdk 36` / `targetSdk 36` (dari log build kita, RN 0.86 / Expo SDK 57) — **sudah memenuhi requirement saat ini MAUPUN requirement Agustus 2026**. Tidak perlu tindakan sekarang. Cek lagi saat Android 17 rilis (~requirement 2027).

## 2. Yang sering ditolak App Store (Apple)

- **Masalah "administratif" (penyebab penolakan terbanyak):** support URL rusak (Guideline 1.5), privacy policy hilang/tidak akurat (5.1.1), dan **App Privacy "nutrition label" yang tidak sesuai perilaku binary sebenarnya** (data yang dideklarasikan ≠ data yang benar-benar dikumpulkan).
- **Crash/performa** (~18-20% penolakan) dan **fitur belum lengkap/placeholder** (~12-15%) — jangan submit build dengan layar "coming soon" atau tombol mati.
- **Pakai API privat/tidak terdokumentasi** (Guideline 2.5.1) — sering ketahuan dari dependency pihak ketiga yang sudah usang (mis. masih pakai `UIWebView`, bukan `WKWebView`).
- **App Tracking Transparency / ATT (Guideline 5.1.2):** SDK yang tracking lintas app/situs wajib munculkan prompt ATT **sebelum** mulai tracking, dengan purpose string yang **spesifik dan jujur** di `Info.plist` — string generik seperti "untuk meningkatkan pengalaman kamu" akan ditolak.
- **Wajib login sebelum bisa lihat konten apa pun** — klasik ditolak (Guideline 5.1.1) kecuali app memang berbasis akun (mis. banking). Selalu kasih user lihat "sesuatu" dulu sebelum dipaksa sign-in.
- **Metadata menyesatkan** (screenshot/deskripsi tidak sesuai app sebenarnya).

## 3. Yang sering ditolak Play Store (Google)

- **Penyalahgunaan permission** — minta permission cuma yang benar-benar esensial untuk fitur inti; "Elevated Privilege Abuse" disebut eksplisit dan ditegakkan; akses data sensitif di background diawasi ketat.
- **Data Safety section tidak sesuai** — data yang dideklarasikan harus sesuai perilaku sebenarnya; entry yang tidak lengkap/menyesatkan berisiko kena penalti atau app dihapus (ini setara "privacy nutrition label"-nya Apple).
- **Behavior SDK pihak ketiga** — kamu tetap bertanggung jawab atas apa yang dilakukan SDK yang kamu pasang; SDK ads/analytics yang mengumpulkan data tanpa dideklarasikan = pelanggaran kamu juga.
- **Minimum Functionality / Spam policy (4.3)** — penyebab #1 penolakan untuk app "website-to-app wrapper": WebView polos tanpa splash screen, tanpa handling offline, tanpa fitur native dianggap spam. Kalau membungkus web app, butuh web manifest, fallback offline, dan integrasi native (push notification, share, kamera, dll) supaya dianggap app "sungguhan".
- **Data kesehatan sensitif** — eksplisit dilarang dipakai untuk keputusan employment/insurance eligibility atau dibagikan ke sosial media tanpa izin.

## 4. Yang relevan khusus buat tim React Native/Expo

- **OTA JS update (Expo Updates / EAS Update) DIIZINKAN di iOS** di bawah App Store Review Guideline **3.3.1(B)**: kode JS/interpreted boleh di-download & dijalankan over-the-air, **selama tidak mengubah tujuan utama/fungsi yang diiklankan app, tidak bypass sandboxing/security OS, dan tidak membuat "toko" untuk app/kode lain.** Binary native-nya sendiri tidak pernah berubah lewat OTA — cuma JS bundle. Yang bikin masalah: pakai OTA push buat menyelundupkan fitur yang harusnya gagal review, atau mengubah app jadi sesuatu yang materially berbeda setelah disetujui.
- **Google tidak punya restriksi setara** untuk update JS-only, tapi rule WebView/Minimum-Functionality di atas tetap relevan kalau app banyak mengandalkan WebView untuk konten (umum di beberapa app Expo yang embed web content).

## Sumber
- [Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google Play Requires Android 16 (API Level 36) by August 31, 2026](https://dev.to/dainyjose/google-play-requires-android-16-api-level-36-by-august-31-2026-react-native-migration-guide-1d51)
- [Meet Google Play's target API level requirement — Android Developers](https://developer.android.com/google/play/requirements/target-sdk)
- [App Store Rejection Reasons in 2026 — App Lander](https://www.applander.io/blog/app-store-rejection-reasons-2026)
- [App Review Guidelines — Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [Developer Program Policy — Play Console Help](https://support.google.com/googleplay/android-developer/answer/16933379?hl=en)
- [Google Play Data Safety Section: Step-by-Step Guide (2026)](https://respectlytics.com/blog/google-play-data-safety-guide/)
- [Does Apple Allow OTA Updates on iOS? Guideline 2.5.2](https://jackappdev.medium.com/does-apple-allow-ota-updates-on-ios-guideline-2-5-2-fc1030f07e20)
- [EAS Update — Expo documentation](https://docs.expo.dev/eas-update/introduction/)
- [Google Play WebView App Policy 2026: Minimum Functionality Compliance Guide](https://blog.webvify.app/blogs/google-play-store-policy-update-2026-webview-guide/)
