# Local storage di React Native + Expo

Perbandingan opsi penyimpanan lokal. Tiga yang ditandai **[dicoba]** punya contoh kerja langsung di
[`src/app/(app)/storage-playground.tsx`](../../src/app/(app)/storage-playground.tsx) (buka dari tab
Profile → "Storage playground").

## 1. AsyncStorage `@react-native-async-storage/async-storage` [dicoba]

Key-value storage asynchronous paling umum di RN — API mirip `localStorage` browser tapi async. Menyimpan **hanya string** (butuh `JSON.stringify`/`parse` manual untuk object), **tidak terenkripsi**.

**Bagus untuk:** preferensi user, cache ringan, draft form, data non-sensitif yang perlu persist antar-sesi.

**Kurang cocok untuk:** data sensitif (token, password — tidak dienkripsi), dataset besar/banyak key.

**Status:** aktif di-maintain (v3.x). v3 punya breaking change: `multiGet/multiSet/multiRemove` → `getMany/setMany/removeMany`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('key', JSON.stringify(value));
const raw = await AsyncStorage.getItem('key');
const value = raw ? JSON.parse(raw) : null;
```

**Kompatibilitas Expo:** jalan di **Expo Go** (wrapper JS di atas storage native bawaan).

## 2. MMKV `react-native-mmkv`

Key-value storage native (asal dari Tencent, dipakai WeChat) berbasis JSI — **synchronous** (bukan Promise), jauh lebih cepat dari AsyncStorage.

v4 sekarang jadi Nitro Module (JSI-backed), diklaim ~30x lebih cepat dari AsyncStorage untuk baca/tulis, mendukung **enkripsi built-in**, kompatibel New Architecture.

**Bagus untuk:** state yang sering dibaca/ditulis (cache, flag, settings) di app yang butuh performa tinggi.

**Kompatibilitas Expo:** **butuh custom dev client** (native module C++) — **tidak jalan di Expo Go**, harus prebuild/`expo run:android`. (Belum dicoba di project ini.)

**Lisensi:** wrapper MIT; core C++ dari Tencent BSD-3-Clause.

## 3. Expo SecureStore [dicoba]

Wrapper Expo di atas iOS Keychain / Android Keystore (EncryptedSharedPreferences) — untuk **nilai kecil dan sensitif** (token, secret key), bukan data besar.

**Batasan ukuran:** historisnya ~2KB per value di Android — jangan simpan blob besar di sini.

```ts
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('token', jwt);
const token = await SecureStore.getItemAsync('token');
```

**Kompatibilitas Expo:** jalan di Expo Go untuk kebutuhan dasar.

## 4. react-native-keychain

Wrapper non-Expo (ekosistem RN umum) untuk iOS Keychain/Android Keystore — lebih lengkap dari SecureStore.

**Kelebihan dibanding SecureStore:**
- Akses digembok biometrik (Face ID/Touch ID/fingerprint) langsung terintegrasi.
- Shared keychain groups (berbagi credential antar-app, iOS).
- Kontrol accessibility level lebih granular.

**Kapan pilih ini dibanding SecureStore:** kalau butuh gate biometrik built-in atau sharing keychain antar app — SecureStore cukup untuk kasus token/secret sederhana tanpa kebutuhan itu.

**Kompatibilitas Expo:** native module — butuh custom dev client. (Belum dicoba di project ini.)

## 5. SQLite [dicoba]

**`expo-sqlite`** — modul SQLite resmi Expo, API berbasis hook (`useSQLiteContext`) yang gampang dipakai dari komponen React.

**Alternatif non-Expo:** `react-native-sqlite-storage` (lebih lama, callback-style), `op-sqlite` (JSI-based, sering diklaim lebih cepat).

**Kapan SQL/relational database jadi pilihan tepat** (dibanding key-value): data terstruktur/relasional (banyak tabel saling terhubung), butuh query kompleks (JOIN, filter, sort), dataset besar, app offline-first yang butuh query bukan sekadar get/set per key.

```ts
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

// bungkus root dengan <SQLiteProvider databaseName="app.db" onInit={migrate}>
function Screen() {
  const db = useSQLiteContext();
  const rows = await db.getAllAsync('SELECT * FROM notes ORDER BY id DESC');
}
```

**Kompatibilitas Expo:** butuh custom dev client (native module).

## 6. FileSystem `expo-file-system` — hanya baca-baca

Baca/tulis file, cache asset yang di-download. **SDK 54 memperkenalkan API baru berbasis class** (`File`, `Directory`) menggantikan API fungsi lama (`copyAsync`, `downloadAsync`, `readAsStringAsync`, dst — semua ditandai deprecated). API lama masih tersedia lewat `expo-file-system/legacy` untuk migrasi bertahap.

## 7. Cloud object storage — hanya baca-baca

Dipakai kalau local storage tidak cukup: sinkronisasi multi-device, backup, file media besar, query di sisi server.

- **Firebase** (Firestore/Realtime DB + Storage): SDK RN matang, real-time performa terbaik (Realtime DB latensi <10ms). Tapi `react-native-firebase` butuh config plugin + custom dev client — tidak jalan di Expo Go.
- **Supabase** (Postgres-based, open-source): cocok kalau tim mau SQL/relational + opsi self-host, row-level security bawaan. `@supabase/supabase-js` jalan langsung di Expo Go (client JS murni). Real-time agak lebih lambat (~50-100ms, berbasis Postgres CDC).

## Ringkasan: pilih yang mana?

| Kebutuhan | Pilihan |
|---|---|
| Token/secret auth (kecil, sensitif) | **Expo SecureStore** (atau `react-native-keychain` kalau butuh biometric gate) |
| Preferensi user, setting, cache ringan | **AsyncStorage** (paling simpel, Expo Go) atau **MMKV** (performa tinggi, sudah pakai dev client) |
| Todo list offline sederhana (flat) | **AsyncStorage**/**MMKV** cukup; **SQLite** kalau ke depan butuh kategori/relasi/query |
| Data terstruktur kompleks, banyak relasi, query | **expo-sqlite** |
| File besar / asset ter-download | **expo-file-system** (API baru `File`/`Directory`) |
| Sinkronisasi multi-device / backup / realtime | **Supabase** (SQL, self-host, Expo Go friendly) atau **Firebase** (realtime tercepat, butuh dev client) |

## Sumber
- [@react-native-async-storage/async-storage - npm](https://www.npmjs.com/package/@react-native-async-storage/async-storage)
- [Releases · react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage/releases)
- [React Native MMKV vs AsyncStorage vs Expo SecureStore: 2026 Storage Decision Guide](https://www.pkgpulse.com/guides/react-native-mmkv-vs-async-storage-vs-expo-secure-store-2026)
- [MMKV v4 vs AsyncStorage: RN Guide 2026 | React Native Relay](https://reactnativerelay.com/article/react-native-mmkv-vs-asyncstorage-2026)
- [Expo Configuration | mrousavy/react-native-mmkv | DeepWiki](https://deepwiki.com/mrousavy/react-native-mmkv/6.3-expo-configuration)
- [SQLite - Expo documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [FileSystem - Expo documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [FileSystem (legacy) - Expo Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/)
- [Supabase vs Firebase for React Native (2026 Edition with Real Pricing)](https://www.applighter.com/blog/supabase-vs-firebase-for-react-native-2026-edition-with-real-pricing)
- [Supabase vs Firebase for React Native Apps in 2026 | ShipNative](https://www.shipnative.dev/blog/supabase-vs-firebase-react-native-2026)
