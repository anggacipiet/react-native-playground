# MSW di React Native: splash stuck, body kosong, dan stream terkunci

## Gejala

Tiga bug terpisah, muncul berurutan:

1. **Aplikasi stuck di splash screen native.** `index.js` menjalankan mock
   server MSW (`server.listen()`) secara synchronous sebelum `expo-router/entry`
   dimuat. `msw/native` melempar `ReferenceError` (`Property 'MessageEvent'
   doesn't exist`, lalu `'BroadcastChannel' doesn't exist`) saat proses setup
   itu — sebelum React sempat merender satu frame pun, sehingga splash native
   (yang hanya hilang setelah JS root ter-render) tidak pernah tertutup.

2. **Setelah bug (1) diperbaiki, API call berhasil tapi parsing gagal:**
   `SyntaxError: JSON Parse error: Unexpected end of input`. Interceptor
   sebenarnya berhasil mencocokkan request (`res.status === 200`,
   `content-type` benar), tapi `res.text()` / `res.json()` mengembalikan
   string kosong.

3. **Setelah bug (2) diperbaiki, dan setelah menambahkan logging body JSON
   ke lifecycle event MSW** (lihat [`src/mocks/server.ts`](../src/mocks/server.ts),
   dan [`react-native-devtools-debugging.md`](./react-native-devtools-debugging.md)
   untuk alasan kenapa logging ini dibutuhkan): `useTodos` gagal lagi, kali
   ini dengan `TypeError: This stream has already been locked for exclusive
   reading by another reader`.

## Akar masalah

### Global web yang hilang (crash saat startup)

`msw/native` secara transitif meng-import `rettime` dan WebSocket interceptor
dari `@mswjs/interceptors`. Keduanya mendeklarasikan class pada **saat modul
dievaluasi**:

- `rettime`: `class TypedEvent extends MessageEvent`
- WebSocket interceptor: `CloseEvent extends Event`, `WebSocketOverride extends EventTarget`

`Event` / `MessageEvent` / `EventTarget` / `BroadcastChannel` tidak ada di
Hermes (semua itu global browser/DOM). Meng-import `msw/native` langsung
melempar error sebelum `setupServer()` sempat dipanggil — WebSocket
interceptor sendiri tidak pernah benar-benar dipakai di app ini (hanya
handler `http`/`fetch` yang dipakai), jadi class-class tersebut cukup bisa
di-*construct*, tidak perlu 100% sesuai spec DOM.

### Body response kosong (data hilang secara diam-diam)

Bug ini lebih lama ditemukan karena setiap lapisan terlihat benar kalau
dicek satu-satu:

- Interceptor MSW berhasil mencocokkan request dan mengembalikan
  `status: 200` dengan `content-type` yang benar.
- `HttpResponse.json(todos)` secara internal melakukan
  `new HttpResponse(JSON.stringify(body), init)` — sebuah **string biasa**,
  bukan stream.
- `@mswjs/interceptors`'s `FetchResponse extends Response`, di mana
  `Response` merujuk ke `global.Response` — jadi polyfill fetch/Response
  yang kita pasang sudah terpakai dengan benar.

Bug sebenarnya ada satu lapis lebih dalam, di **`react-native-fetch-api`**
(polyfill fetch yang dipakai untuk menggantikan `fetch` bawaan RN, yang
memang tidak punya `Response.body` yang bisa dibaca sebagai stream — lihat
[facebook/react-native#27741](https://github.com/facebook/react-native/issues/27741)).
Getter `Body.prototype.body` miliknya, yang dipakai oleh interceptor MSW
saat membangun ulang response mock lewat
`new FetchResponse(rawResponse.body, ...)`, melakukan:

```js
// getter asli (buggy) milik react-native-fetch-api
const typedArray = new Uint8Array(text); // text adalah STRING
```

`new Uint8Array(someString)` **tidak** melakukan encode UTF-8 pada string —
ia memperlakukan string sebagai array-like memakai `.length` dan akses per
index, sehingga tiap karakter dikonversi jadi `NaN` → `0`. Stream berisi
byte nol ini kemudian masuk ke spread `[...bytes, ...chunk]` milik
`drainStream()`, yang hasilnya jadi data sampah atau praktis kosong. Intinya:
body JSON hilang secara diam-diam jauh sebelum sampai ke `res.json()` di
`apiFetch`.

### Stream terkunci saat dibaca dua kali (`response.clone()` yang buggy)

Bug ini baru muncul setelah bug (2) di atas sudah beres, dipicu oleh
perubahan lain: menambahkan listener `server.events.on('response:mocked', ...)`
di `src/mocks/server.ts` yang membaca body response untuk keperluan logging
(supaya request yang di-mock MSW tetap kelihatan di Console panel — Network
panel DevTools tidak bisa melihatnya sama sekali, karena request yang
di-mock tidak pernah lewat native networking layer).

Aturan dasar Fetch API: body cuma bisa dibaca **sekali** (`bodyUsed`).
`apiFetch` sendiri juga baca body responsenya (`res.json()`). Supaya
listener logging tidak "menghabiskan" body yang harusnya masih dipakai
`apiFetch`, listener itu baca lewat `response.clone()` dulu — pola standar
di web, karena `clone()` seharusnya menghasilkan salinan independen.

Tapi `react-native-fetch-api`'s `Response.prototype.clone()` melakukan:

```js
// clone() asli (buggy) milik react-native-fetch-api
clone() {
  return new Response(this._body._bodyInit, { ...this }); // _bodyInit sama persis
}
```

Kalau body-nya `ReadableStream` (ini persis kasus response hasil mock MSW,
karena `FetchInterceptor` membangun ulang response lewat
`new FetchResponse(rawResponse.body, ...)` — lihat bug (2) di atas), maka
`_bodyInit` adalah **referensi stream yang sama**. Jadi "clone" itu bukan
salinan independen — dua `Response` (yang asli dan hasil clone) sama-sama
menunjuk ke satu `ReadableStream` yang sama. Begitu salah satu memanggil
`getReader()` (mis. listener logging baca duluan lewat `.text()`), stream itu
langsung "locked" untuk pembaca lain — dan ketika `apiFetch` gantian baca
lewat `res.json()` di response ASLI (bukan clone-nya), dia dapat error
`TypeError: This stream has already been locked for exclusive reading by
another reader`, bukan data.

## Perbaikan

Tiga file polyfill, dimuat berurutan, **sebelum** `msw/native` di-import
(hanya untuk dev, hanya untuk native — di web `fetch` sudah sesuai spec):

- [`src/polyfills/web-events.ts`](../src/polyfills/web-events.ts) — stub
  minimal untuk `Event` / `MessageEvent` / `EventTarget` / `BroadcastChannel`,
  dengan guard supaya global asli (di web) tidak tertimpa.
- [`src/polyfills/fetch-streams.ts`](../src/polyfills/fetch-streams.ts) —
  mengganti `fetch`/`Headers`/`Request`/`Response` dengan
  `react-native-fetch-api` (memakai `reactNative: { textStreaming: true }`
  supaya body benar-benar bisa di-stream), menambahkan `ReadableStream`
  (`web-streams-polyfill`) dan `TextEncoder`/`TextDecoder` (`text-encoding`),
  **serta menambal dua hal yang buggy**:
  1. getter `body` — seperti dijelaskan di atas, supaya menghasilkan satu
     chunk `Uint8Array` yang di-encode UTF-8 dengan benar, bukan data
     sampah.
  2. `clone()` — di-tambal supaya, kalau body-nya `ReadableStream`, stream
     itu di-`tee()` jadi dua cabang independen (satu balik ke instance
     `this`, satu buat instance hasil clone) alih-alih naif memakai ulang
     `_bodyInit` yang sama. Ini benerin bug (3) di atas, dan berguna secara
     umum — bukan cuma buat listener logging kita, MSW sendiri juga
     memanggil `clone()` secara internal di beberapa tempat.
- [`src/msw.polyfill.ts`](../src/msw.polyfill.ts) — orkestrator yang
  meng-import dua file di atas (plus `react-native-url-polyfill/auto`) sesuai
  urutan yang dibutuhkan.

`index.js` melakukan `require('./src/msw.polyfill')` secara synchronous
(bukan lewat top-level `await` — entry point async membuat RN crash saat
launch dengan `RCTFatal` native, karena registrasi `AppRegistry` harus
synchronous) sebelum `require('expo-router/entry')`, dan hanya di dalam
`if (__DEV__)`.

### Dua noise tambahan (bukan bug, tapi bikin Console berisik)

Dua peringatan lain yang muncul setelah setup di atas jalan normal — bukan
bug fungsional, tapi sengaja dibersihkan supaya Console tidak berisik:

1. **`Deep imports from the 'react-native' package are deprecated
   ('react-native/Libraries/Utilities/PolyfillFunctions')`** — babel preset
   RN (`@react-native/babel-preset`) otomatis menyisipkan `console.warn` di
   runtime untuk setiap deep import `react-native/Libraries/...` yang
   ditemukan di mana pun dalam file itu (statement-nya ditambahkan di
   **akhir file** hasil compile, bukan tepat setelah baris import-nya, dan
   tetap muncul terlepas dari guard `Platform.OS` di sekitar require
   aslinya). `PolyfillFunctions` tidak punya API publik pengganti (bahkan
   dokumentasi resmi `react-native-fetch-api` sendiri mengarahkan ke cara
   ini lewat `react-native-polyfill-globals`, yang di baliknya melakukan
   deep import yang sama).

   Percobaan pertama pakai `LogBox.ignoreLogs([...])` **tidak cukup** —
   itu cuma menyembunyikan dari overlay LogBox in-app, sedangkan React
   Native DevTools' Console panel baca `console.warn` langsung dari JS
   engine lewat CDP (jalur berbeda dari LogBox), jadi warning-nya tetap
   muncul di sana. Perbaikan yang benar: patch `console.warn` itu sendiri
   supaya menyaring pesan ini secara spesifik, di
   [`src/polyfills/fetch-streams.ts`](../src/polyfills/fetch-streams.ts).

2. **`[MSW] Warning: intercepted a request without a matching request
   handler: POST /symbolicate`** — MSW meng-intercept `fetch` secara
   global, jadi ikut menangkap request internal Metro sendiri (mis.
   `/symbolicate`, dipakai buat menerjemahkan stack trace minified balik ke
   source asli untuk error overlay). Itu bukan bagian dari API yang kita
   mock, jadi bukan sesuatu yang perlu di-warn. Diperbaiki dengan mengganti
   `onUnhandledRequest: 'warn'` di `index.js` jadi fungsi custom yang cuma
   memanggil `print.warning()` kalau URL request-nya benar-benar diawali
   `API_URL` — request lain (termasuk trafik internal Metro) di-bypass
   diam-diam tanpa warning.

## Kenapa bug ini susah ditemukan

Setiap lapisan (pencocokan interceptor, status code, content-type,
konstruktor `Response`, body string biasa dari `HttpResponse.json`) benar
kalau dicek satu per satu. Bug (2)-nya ada di satu baris getter body milik
polyfill pihak ketiga, dan baru "kena" ketika library lain (MSW) memanggil
`.body` langsung — bukan `.text()`/`.json()`. Ditambah lagi, `catch { setError(...) }`
awal di `useTodos` menelan error aslinya begitu saja, jadi tidak ada
petunjuk sampai kodenya diubah untuk `console.error` error yang ketangkap
dan membaca `res.text()` secara manual untuk melihat payload mentah
(yang ternyata kosong).

Bug (3) polanya mirip: `clone()` bekerja normal untuk body berupa string
(kasus paling umum, makanya tidak ketahuan lebih awal), dan baru gagal
spesifik untuk body berupa `ReadableStream` — yang notabene cuma muncul
karena bug (2) di atas (MSW membangun ulang response lewat
`new FetchResponse(rawResponse.body, ...)`, dan `rawResponse.body` itu
sendiri adalah hasil getter yang sudah kita tambal untuk mengembalikan
stream). Jadi dua bug ini saling berkaitan lewat jalur yang sama: getter
`body` yang ditambal justru "menyingkap" kelemahan `clone()` yang sebelumnya
tidak pernah teruji karena body selalu berupa string biasa.

## Referensi

Bug MSW + React Native ini bukan hal baru — sudah lama dilaporkan komunitas,
dan pola akar masalahnya konsisten: `fetch` bawaan RN tidak expose
`Response.body` sebagai `ReadableStream`
([facebook/react-native#27741](https://github.com/facebook/react-native/issues/27741)),
dan setiap solusi yang mencoba "membangun ulang" response lewat `.body`
alih-alih `.clone()` akan kehilangan data di React Native.

- **[mswjs/msw#1926](https://github.com/mswjs/msw/issues/1926)** (2023,
  closed) — Laporan pertama pola persis bug (2) kita: `HttpResponse.json()`
  kelihatan benar di handler, tapi `res.json()` di app dapat body kosong.
  `willdawsonme` menemukan akar masalahnya:
  `@mswjs/interceptors`'s `FetchInterceptor` waktu itu melakukan
  `new Response(mockedResponse.body, mockedResponse)` — dan
  `mockedResponse.body` adalah `undefined` di RN, jadi Response baru yang
  dibangun ulang otomatis kosong. Patch-nya: ganti jadi
  `mockedResponse.clone()`. Maintainer MSW (`kettanaito`) mengambil patch
  ini lewat PR #2016 dan **resmi rilis di msw v2.1.7** (Feb 2024) — prinsip
  "pakai `.clone()`, jangan rebuild lewat `.body`" ini persis insight yang
  kita pakai sendiri buat benerin bug (3) kita. Komentar-komentar setelahnya
  juga mencatat bahwa **axios/`XMLHttpRequestInterceptor` masih bermasalah**
  meski fetch sudah diperbaiki — relevan kalau project ini nanti pindah dari
  `fetch` ke axios.

- **[mswjs/mswjs.io#506](https://github.com/mswjs/mswjs.io/issues/506)**
  (Oktober 2025, masih **open**) — Laporan bahwa dokumentasi resmi
  integrasi React Native (yang jadi basis `src/msw.polyfill.ts` dan
  `src/polyfills/*.ts` kita) masih menghasilkan error kalau diikuti apa
  adanya. Salah satu komentar (`LeOndaz`) menyarankan pendekatan alternatif:
  bikin ulang server mock minimal sendiri yang monkey-patch `global.fetch`
  langsung dan memanggil `handler.resolver()` tanpa lewat
  `@mswjs/interceptors` sama sekali — sepenuhnya menghindari lapisan
  `Response`/`ReadableStream` yang jadi sumber semua bug di dokumen ini,
  dengan tradeoff kehilangan sebagian fitur matching MSW yang asli (lihat
  diskusi lengkapnya di riwayat chat, belum diadopsi di project ini).

### Kenapa setup kita "menyimpang" dari dokumentasi resmi

[Dokumentasi resmi integrasi React Native](https://mswjs.io/docs/integrations/react-native/)
per hari ini isinya **persis** setup awal yang dilaporkan gagal di kedua
issue di atas — belum diperbarui untuk mencerminkan masalah yang sudah
dilaporkan komunitas sejak 2023:

| Yang disebut dokumentasi resmi | Kenyataan (dari issue GitHub + pengalaman kita) |
| --- | --- |
| Polyfill cuma `fast-text-encoding` + `react-native-url-polyfill` | Tidak cukup — `msw/native` langsung crash `ReferenceError: MessageEvent`/`BroadcastChannel doesn't exist` saat di-import (bug 1 di atas); tidak disebut sama sekali di dokumentasi |
| Tidak ada penyebutan soal `Response.body` / `ReadableStream` | Ini justru bug paling parah (bug 2 dan 3 di atas), dan persis akar masalah di mswjs/msw#1926 sejak 2023 — tidak pernah ditambahkan ke dokumentasi |
| `enableMocking()` di `index.js` contoh resmi pakai `await import(...)` (async) | Berisiko crash RN saat launch (`RCTFatal` / "non-std C++ exception") karena `AppRegistry`/entry point harus register secara synchronous — makanya `index.js` kita pakai `require()` biasa, bukan `import()` async |
| Bagian "Common Issues" cuma bahas typo `msw/node` vs `msw/native` | Tidak menyinggung sama sekali dua bug besar yang justru paling sering dikeluhkan di GitHub issues |

Jadi `src/msw.polyfill.ts` + `src/polyfills/*.ts` di project ini bukan
"nyimpang tanpa alasan" dari cara resmi — itu versi yang sudah menambal
gap nyata antara dokumentasi resmi dan kondisi sebenarnya di lapangan.
