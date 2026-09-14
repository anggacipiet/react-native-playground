# Komponen umum React Native & Global State Management

## Bagian 1 — Core Components and APIs

### ScrollView

**Fungsi:** container scrollable generik. Me-render **SEMUA** children sekaligus saat mount — tidak ada virtualisasi/windowing sama sekali.

```jsx
<ScrollView>
  {items.map((item) => (
    <Text key={item.id}>{item.title}</Text>
  ))}
</ScrollView>
```

**Kapan pakai:** konten pendek dengan jumlah/ukuran yang diketahui dan tidak berubah-ubah — form panjang, halaman detail, onboarding carousel kecil.

**Kapan JANGAN pakai:** list panjang atau dinamis (ratusan/ribuan item, data dari API yang bisa bertambah). Karena semua children di-render sekaligus (tanpa "jendela render" terbatas), ini jadi masalah memori dan performa — device bisa lag atau bahkan crash pada list besar.

### "ListView" → sudah dihapus, sekarang FlatList

`ListView` **sudah lama dihapus** dari React Native — dideprecate di RN 0.48, dan benar-benar dihapus di RN 0.56. Pengganti resminya adalah **FlatList** (dan `SectionList` untuk list berkelompok/section). Migrasinya menghilangkan pola `DataSource` yang dulu wajib dipakai ListView — `renderItem` menggantikan `renderRow`.

**FlatList** adalah komponen list yang ter-**virtualisasi** (windowed): hanya me-render item yang terlihat di layar plus buffer kecil, dan me-recycle view saat di-scroll — inilah yang membuatnya jauh lebih hemat memori dibanding ScrollView untuk list panjang.

```jsx
<FlatList
  data={todos}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <TodoItem todo={item} />}
  ListHeaderComponent={<TodoForm />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

Props penting lainnya:
- `renderItem` — cara render tiap item.
- `keyExtractor` — key unik per item (**jangan** pakai index array sebagai key kalau data bisa berubah urutan/isi — bisa bikin flicker/data salah tampil).
- `onEndReached` (+ `onEndReachedThreshold` ~0.5) — untuk infinite scroll/pagination; guard dengan flag loading karena callback ini bisa terpanggil lebih dari sekali saat scroll terus.
- `ListHeaderComponent`/`ListFooterComponent`/`ListEmptyComponent`.
- Tuning performa: `windowSize`, `initialNumToRender`, `maxToRenderPerBatch`.

### Modal

Komponen `<Modal>` bawaan RN untuk menampilkan konten di atas seluruh app.

```jsx
<Modal visible={isOpen} onRequestClose={close} animationType="slide">
  <View>...</View>
</Modal>
```

**Catatan penting:**
- **`onRequestClose` WAJIB diisi di Android** — ini yang menangani tombol back hardware. Kalau tidak diisi, tombol back terlihat "tidak ngapa-ngapain" saat modal terbuka.
- Selama modal terbuka, **listener `BackHandler` lain di app tidak akan ter-trigger** — RN sengaja memblokir event `BackHandler` biasa selama modal aktif.
- Asimetri platform: di iOS, app tetap "jalan" walau `onRequestClose` lupa diisi (karena iOS tidak punya tombol back hardware) — bug ini gampang lolos kalau cuma testing di iOS.
- Modal me-render dalam native view hierarchy/root **terpisah** — dua instance Modal aktif bersamaan adalah sumber bug umum (layar blank, modal yang tidak pernah tertutup).

**Alternatif komunitas** yang sering dipakai tim production dibanding Modal bawaan:
- **`@gorhom/bottom-sheet`** — untuk bottom-sheet yang bisa di-drag, gesture-nya jauh lebih natural.
- **`react-native-modal`** — wrapper di atas Modal bawaan dengan animasi lebih kaya dan API lebih ergonomis.

### VirtualizedList

Primitif level-rendah yang jadi basis implementasi virtualisasi untuk `FlatList` **dan** `SectionList`. Ia yang benar-benar mengimplementasikan mekanisme windowing.

**Kapan turun ke VirtualizedList langsung:** kalau data-mu **bukan array biasa** (struktur data immutable/custom, atau sumber data yang tidak bisa direpresentasikan sebagai array flat).

**Kapan cukup FlatList (kasus umum):** kalau data-mu sudah berbentuk array biasa — inilah 95%+ kasus penggunaan nyata.

## Bagian 2 — Global State Management

### React Context ≈ `provide`/`inject` di Vue

Konsepnya memang sangat mirip: sebuah ancestor di tree bisa "menyediakan" (provide) sebuah value, dan descendant manapun di bawahnya bisa "membaca" (inject) value itu lewat `useContext` — tanpa perlu prop-drilling manual lewat setiap level komponen di antaranya.

Contoh nyata dari project ini sendiri (`src/lib/auth-context.tsx`) — pola Context murni, tanpa library tambahan:

```tsx
const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext); // React 19's `use()`, setara useContext
  if (!value) throw new Error('useSession must be used within a <SessionProvider />');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const value = useMemo(() => ({ session, isLoading: false, signIn: ..., signOut: ... }), [session]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
```

**Keterbatasan yang perlu diketahui:** setiap kali *value* dari sebuah Context berubah, **SEMUA** komponen yang men-consume Context itu ikut re-render — walaupun komponen tersebut sebenarnya cuma pakai sebagian kecil dari value itu. Ini bisa diatasi dengan memecah jadi beberapa Context terpisah atau memoization yang cermat, tapi itulah kenapa Context **tidak selalu dianggap solusi "state management" penuh** untuk aplikasi besar.

### Apakah perlu library seperti Zustand (mirip Pinia)?

- **Context + `useState`/`useReducer` sudah cukup** untuk state yang scope-nya memang terikat ke satu subtree komponen tertentu, atau untuk app kecil-menengah. `src/lib/auth-context.tsx` di project ini adalah contoh nyata yang pas.

- **Zustand (atau alternatif seperti Jotai, Redux Toolkit, TanStack Query khusus server-state) baru terasa perlu** ketika:
  - State harus dibaca/ditulis dari banyak bagian tree yang tidak berhubungan langsung, dengan frekuensi update tinggi.
  - Kamu ingin selector-based subscription (component hanya re-render kalau bagian state yang dia pakai berubah).
  - Butuh middleware siap pakai: persistence (auto-save ke storage), devtools, dsb.
  - Kompleksitas logic update state sudah butuh reducer pattern yang lebih terstruktur.

Dari sisi API, `create()` di Zustand (bikin store + hook dengan selector) itu **konsepnya sangat dekat dengan `defineStore` di Pinia** — sama-sama "define store sekali, pakai hook/composable-nya di mana saja".

## Sumber
- [VirtualizedList · React Native](https://reactnative.dev/docs/virtualizedlist)
- [React Native — Virtualization Performance Optimization](https://medium.com/@anisurrahmanbup/react-native-virtualization-performance-optimization-flatlist-sectionlist-virtualizedlist-8430da4c68b3)
- [VirtualizedList vs FlatList in React Native | Diogo Izele](https://blog.diogoizele.com/posts/REACT-NATIVE-ADVANCED-TOPICS-VIRTUALIZED-LIST-VS-FLAT-LIST/)
- [React Native FlatList: The Props That Matter (2026) | ShipNative](https://www.shipnative.dev/blog/react-native-flatlist)
- [Modal · React Native](https://reactnative.dev/docs/modal)
- [React Native Modal: Which One to Use (2026) | ShipNative](https://www.shipnative.dev/blog/react-native-modal)
- [Why React Native Modals Require an onRequestClose Callback Property on Android](https://kylewbanks.com/blog/why-react-native-modals-require-onrequestclose-callback-property-on-android)
- [ListView has been removed from React Native · Issue #69](https://github.com/thegamenicorus/react-native-timeline-listview/issues/69)
- [FlatList · React Native](https://reactnative.dev/docs/flatlist)
- [A deep dive into React Native FlatList - LogRocket Blog](https://blog.logrocket.com/deep-dive-react-native-flatlist/)
