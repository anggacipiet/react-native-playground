# react-native-expo-playground

Playground Expo untuk eksplorasi: NativeWind (Tailwind), routing + auth guard via Expo Router, wrapping SafeArea, CRUD Todo list, validasi form dengan React Hook Form + Yup, integrasi API, dan mocking API dengan MSW (Mock Service Worker).

## 1. Tech stack / Tools

| Tools | Versi | Kegunaan |
|---|---|---|
| Expo | ~57.0.21 | Framework & tooling utama |
| Expo Router | ~57.0.20 | File-based routing + navigation guard (`Stack.Protected`) |
| React | 19.2.3 | UI library |
| React Native | 0.86.3 | Runtime native |
| TypeScript | ~6.0.3 | Type checking |
| NativeWind | ^4.2.6 | Tailwind CSS untuk React Native |
| Tailwind CSS | ^3.4.19 | Dipakai NativeWind di balik layar |
| React Hook Form | ^7.87.0 | State & handling form |
| Yup | ^1.7.1 | Schema validasi form |
| @hookform/resolvers | ^5.9.1 | Jembatan Yup schema ↔ React Hook Form |
| MSW (Mock Service Worker) | ^2.15.0 | Mocking network request (pakai entry `msw/native`) |
| react-native-url-polyfill, fast-text-encoding | - | Polyfill wajib supaya MSW jalan di React Native |
| react-native-safe-area-context | ~5.7.0 | `SafeAreaProvider` / `SafeAreaView` |

> **Catatan penting:** project ini dibuat di atas Expo SDK 57 yang sangat baru (React 19, RN 0.86). Kalau butuh referensi API, cek dulu dokumentasi versi yang sesuai di `https://docs.expo.dev/versions/v57.0.0/` — jangan asumsikan sama dengan versi lama.

## 2. Struktur folder

```
react-native-expo-playground/
├── index.js                     # Entry point custom: polyfill → (dev) start MSW → expo-router/entry
├── babel.config.js              # babel-preset-expo + preset/plugin nativewind
├── metro.config.js              # withNativeWind(config, { input: './src/global.css' })
├── tailwind.config.js           # content path ./src/**/*, preset nativewind
├── nativewind-env.d.ts          # type declaration nativewind + `declare module '*.css'`
├── src/
│   ├── global.css               # @tailwind base/components/utilities + css var font (web)
│   ├── app/                     # root Expo Router (file-based routing)
│   │   ├── _layout.tsx          # SafeAreaProvider + SessionProvider + Stack guard
│   │   ├── sign-in.tsx          # halaman publik (mock login)
│   │   └── (app)/               # group halaman yang butuh login
│   │       ├── _layout.tsx      # Tabs: Home, Todos, Profile
│   │       ├── index.tsx        # Home
│   │       ├── todos.tsx        # Todo CRUD page
│   │       └── profile.tsx      # Profile + sign out
│   ├── lib/
│   │   ├── auth-context.tsx     # SessionProvider + useSession (mock auth)
│   │   └── todo-schema.ts       # Yup schema untuk form todo
│   ├── components/
│   │   ├── todo-form.tsx        # form create/edit todo (React Hook Form + Yup)
│   │   └── todo-item.tsx        # 1 baris todo (toggle/edit/delete)
│   ├── hooks/
│   │   └── use-todos.ts         # state list todo + pemanggilan API
│   ├── api/
│   │   ├── client.ts            # fetch wrapper + base URL + error handling
│   │   └── todos.ts             # fetchTodos/createTodo/updateTodo/deleteTodo
│   ├── types/
│   │   └── todo.ts              # tipe Todo & TodoInput
│   └── mocks/
│       ├── handlers.ts          # handler MSW untuk GET/POST/PATCH/DELETE /todos
│       └── server.ts            # setupServer dari 'msw/native'
```

## 3. Setup & instalasi

Prasyarat: Node.js (project ini dites dengan Node 24), npm.

```bash
cd react-native-expo-playground
npm install
```

Tidak perlu env var apapun untuk mulai — API todo sepenuhnya di-mock oleh MSW saat development (lihat bagian [Mock API](#7-mock-api-msw)).

## 4. Cara menjalankan

```bash
npm run web        # jalan di browser (expo start --web)
npm run android     # expo start --android (butuh emulator/device)
npm run ios         # expo start --ios (butuh macOS)
npm start           # expo start biasa (pilih platform dari menu Expo CLI / scan QR pakai Expo Go)
```

Setelah server jalan:
1. Akan diarahkan ke halaman **Sign in** (karena belum ada session).
2. Isi email apa saja (mock login, tidak dicek ke server) → tekan **Sign in**.
3. Akan pindah ke tab **Home / Todos / Profile**.
4. Ke tab **Todos** untuk coba CRUD (data awal datang dari mock MSW, 2 item seed).
5. Di tab **Profile** ada tombol **Sign out** untuk logout dan kembali ke Sign in (untuk test guard-nya lagi).

## 5. Fitur & cara kerja detail

### 5.1 NativeWind (Tailwind di React Native)
Konfigurasi ada di 3 file: `babel.config.js` (preset `nativewind/babel` + `jsxImportSource: 'nativewind'`), `metro.config.js` (`withNativeWind` dengan `input: './src/global.css'`), dan `tailwind.config.js` (`content: ['./src/**/*.{js,jsx,ts,tsx}']`). Semua komponen tinggal pakai prop `className` seperti web (contoh: `src/app/sign-in.tsx`, `src/components/todo-item.tsx`).

### 5.2 Routing 3 halaman + Guard (middleware)
Expo Router (SDK 57) **tidak** punya middleware server seperti Next.js — dokumentasi resminya bilang "no support for custom middleware or serving" di web. Mekanisme guard yang dipakai di sini adalah **`Stack.Protected`** (fitur Expo Router sejak SDK 53), lihat `src/app/_layout.tsx`:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!session}>
    <Stack.Screen name="(app)" />
  </Stack.Protected>
  <Stack.Protected guard={!session}>
    <Stack.Screen name="sign-in" />
  </Stack.Protected>
</Stack>
```

`session` datang dari `useSession()` (`src/lib/auth-context.tsx`) — context sederhana in-memory (reset kalau app di-reload, sengaja tidak dipersist supaya demo guard-nya gampang diulang). Kalau `session` kosong → hanya route `sign-in` yang bisa diakses; kalau ada session → hanya group `(app)` yang bisa diakses. 3 halaman di dalam `(app)` diatur sebagai tab (`src/app/(app)/_layout.tsx`): **Home**, **Todos**, **Profile**.

Untuk menambah halaman terproteksi baru: buat file di `src/app/(app)/nama-halaman.tsx` lalu daftarkan sebagai `<Tabs.Screen name="nama-halaman" .../>` di `(app)/_layout.tsx`. Untuk halaman publik (tanpa login): buat file langsung di `src/app/` dan tambahkan sebagai `<Stack.Screen>` di root `_layout.tsx`.

### 5.3 SafeArea
`SafeAreaProvider` (react-native-safe-area-context) dipasang di root `_layout.tsx` membungkus seluruh app. Tiap halaman lalu pakai `SafeAreaView` dari package yang sama (lihat `sign-in.tsx`, `(app)/index.tsx`, `(app)/todos.tsx`, `(app)/profile.tsx`) supaya konten tidak ketutupan notch/status bar/home indicator.

### 5.4 CRUD Todo list
Halaman: `src/app/(app)/todos.tsx`. Alur data: `useTodos()` (`src/hooks/use-todos.ts`) fetch list saat mount, lalu expose `add`, `edit`, `toggle`, `remove` yang masing-masing memanggil fungsi di `src/api/todos.ts` dan sinkronisasi state lokal dari response API (bukan optimistic update manual). UI list pakai `FlatList` + komponen `TodoItem` (`src/components/todo-item.tsx`) untuk tombol toggle selesai / Edit / Delete.

### 5.5 Validasi form — React Hook Form + Yup
Schema: `src/lib/todo-schema.ts`
```ts
export const todoSchema = yup.object({
  title: yup.string().trim().min(3, '...').required('...'),
  description: yup.string().trim().max(200, '...').default(''),
});
```
Dipakai di `src/components/todo-form.tsx` lewat `useForm({ resolver: yupResolver(todoSchema) })`. Komponen ini dipakai dua kali di `todos.tsx`: mode **create** (tanpa `defaultValues`) dan mode **edit** (`defaultValues` diisi dari todo yang dipilih, form di-`key`-kan per `todo.id` supaya reset value saat ganti target edit).

### 5.6 Integrasi API
`src/api/client.ts` berisi `apiFetch<T>()` — wrapper `fetch` dengan base URL dari env `EXPO_PUBLIC_API_URL` (default `https://api.expo-playground.dev` kalau env tidak di-set), auto set header JSON, dan lempar `ApiError` kalau response tidak `ok`. `src/api/todos.ts` memakai wrapper ini untuk `fetchTodos / createTodo / updateTodo / deleteTodo`. Form todo (`onSubmit`) langsung memanggil `add`/`edit` dari `useTodos()`, yang di baliknya memanggil fungsi-fungsi API ini — jadi submit form = hit API beneran (yang saat development di-intercept oleh MSW, lihat bawah).

Untuk connect ke backend asli: set env `EXPO_PUBLIC_API_URL=https://api-asli-kamu.com` (buat file `.env`), dan **matikan** MSW (lihat bagian bawah) supaya request tidak lagi di-intercept.

### 5.7 Mock API (MSW)
Kenapa perlu polyfill & entry khusus: MSW butuh Web API standar (`URL`, `TextEncoder`) yang tidak ada secara native di React Native/Hermes, dan Expo Router pakai entry `expo-router/entry` sehingga tidak ada `index.js` biasa buat naruh setup sebelum app render.

Solusinya, lihat `index.js` (dan `package.json` → `"main": "./index.js"`):
```js
import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';

if (__DEV__) {
  const { server } = require('./src/mocks/server');
  server.listen({ onUnhandledRequest: 'bypass' });
}

require('expo-router/entry');
```
Urutannya penting: polyfill dulu → baru start mock server (kalau `__DEV__`) → baru register root component lewat `expo-router/entry`.

Handler mock ada di `src/mocks/handlers.ts` (in-memory array, seed 2 todo) memakai `http`/`HttpResponse` dari `msw`, dan `src/mocks/server.ts` memanggil `setupServer(...)` dari **`msw/native`** (bukan `msw/node` — export khusus React Native).

Untuk mematikan mock (misal sudah connect ke API asli): hapus/comment blok `if (__DEV__) { ... }` di `index.js`, atau ubah kondisinya jadi flag terpisah (misal `process.env.EXPO_PUBLIC_USE_MOCKS === '1'`).

> **Catatan:** saat run di web akan muncul warning `Attempted to import the module "msw/native" ... falling back to file-based resolution` — ini harmless, MSW tetap jalan (sudah diverifikasi lewat automated browser test: sign-in → guard → tab → create/edit/delete todo semua sukses tanpa error).

## 6. Scripts npm

| Script | Perintah | Keterangan |
|---|---|---|
| `npm start` | `expo start` | Buka Expo CLI menu (pilih platform) |
| `npm run web` | `expo start --web` | Jalan di browser |
| `npm run android` | `expo start --android` | Jalan di emulator/device Android |
| `npm run ios` | `expo start --ios` | Jalan di simulator iOS (perlu macOS) |
| `npm run lint` | `expo lint` | ESLint (config: `eslint-config-expo`) |
| `npm run reset-project` | `node ./scripts/reset-project.js` | ⚠️ **Jangan dijalankan** di project ini — script bawaan template ini memindahkan folder `src` ke `example` dan bikin `src/app` kosong baru, artinya semua fitur yang sudah dibuat (routing, guard, todo CRUD, dst.) akan ikut terpindah/hilang dari lokasi aslinya. |

## 7. Known issues / catatan tambahan

- `npx expo lint` sempat menandai `react-hooks/set-state-in-effect` di `src/hooks/use-todos.ts` (rule baru dari React Compiler eslint plugin yang cukup ketat terhadap pola fetch-on-mount). Sudah diperbaiki dengan memindahkan semua `setState` supaya hanya jalan setelah `await`, plus 1 `eslint-disable-next-line` bertarget dengan komentar alasannya (fetch-on-mount adalah pola effect yang valid menurut dokumentasi React sendiri).
- `npx tsc --noEmit` dan `npx expo lint` sudah bersih (0 error) per commit terakhir yang menyentuh file-file ini.
- Auth session sengaja **tidak dipersist** (in-memory saja) — reload halaman / restart app akan logout otomatis. Kalau mau persist, tambahkan `expo-secure-store` (native) / `localStorage` (web) di `src/lib/auth-context.tsx`, mirip pola `useStorageState` di dokumentasi resmi Expo Router authentication.
