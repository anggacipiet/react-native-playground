# Cara kerja komponen React Native & pemetaan konsep dari Vue

Catatan riset — untuk developer yang sudah paham Vue dan sedang belajar React Native.

## 1. Cara bikin/pakai komponen, dan cara kerjanya di balik layar

### Functional component + JSX

Komponen React Native itu cuma fungsi JS biasa yang me-return JSX (dikompilasi jadi pemanggilan `React.createElement(...)`). Tidak ada file template terpisah, tidak ada blok `<script setup>`, tidak ada compiler step SFC — markup dan logic ada di satu badan fungsi yang sama.

```tsx
type GreetingProps = { name: string };

function Greeting({ name }: GreetingProps) {
  return (
    <View>
      <Text>Hello, {name}</Text>
    </View>
  );
}
```

### Komponen RN ≠ elemen HTML

Di Vue-untuk-web, `<div>`/`<span>`/`<button>` adalah elemen DOM asli yang dirender browser. Di React Native, `<View>`, `<Text>`, `<Image>`, `<ScrollView>`, dll **bukan elemen DOM sama sekali** — tidak ada DOM, tidak ada HTML, tidak ada CSS engine. Masing-masing adalah proxy sisi-JS untuk native view platform asli (`android.view.View` / `UIView` di iOS).

Di arsitektur RN saat ini ("New Architecture"), renderer-nya bernama **Fabric**, alurnya:
1. JSX-mu menghasilkan **fiber tree** React (di JS).
2. Fabric mencerminkannya jadi **Shadow Tree** yang hidup di C++ bersama (bukan JS, bukan native) — di sinilah Yoga (engine flexbox RN) menghitung layout.
3. Fabric commit itu jadi **Host View Tree** — native view sungguhan di layar.

Karena Shadow Tree ada di C++, JS bicara ke native secara synchronous lewat **JSI** (JavaScript Interface), bukan "bridge" lama (antrian pesan JSON async) — inilah yang menghilangkan lag terkait bridge lama. Efeknya buat kamu sebagai penulis app: `<View style={{flex:1}}>` benar-benar jadi native container view asli, bukan `<div>` yang di-style.

### One-way data flow (tidak ada `v-model` bawaan)

`v-model` di Vue itu two-way: child bisa menulis balik ke value yang di-bind parent secara implisit. Props React/RN cuma **satu arah**: parent → child saja. Child tidak pernah bisa mengubah prop. Untuk dapat behavior "two-way binding", kamu kirim value **dan** callback secara eksplisit:

```tsx
// Vue: <TextInput v-model="text" />
// Setara di RN — value turun, perubahan naik lewat callback eksplisit:
function Field() {
  const [text, setText] = useState('');
  return <TextInput value={text} onChangeText={setText} />;
}
```

Tidak ada "sinkronisasi" level-framework — kamu selalu pasang callback-nya sendiri.

### Lifecycle: hooks, bukan lifecycle methods

RN (React) tidak punya `mounted()/updated()/unmounted()` ala Options API Vue sebagai API lifecycle terpisah. Semuanya lewat `useEffect` (plus `useState`/`useRef`):

| Vue (Options/Composition) | React / React Native |
|---|---|
| `onMounted(() => {...})` | `useEffect(() => {...}, [])` (deps kosong = jalan sekali setelah mount) |
| `onUpdated(() => {...})` (setelah dep reaktif berubah) | `useEffect(() => {...}, [dep1, dep2])` (jalan saat dep yang didaftar berubah) |
| `onUnmounted(() => {...})` | `useEffect(() => { return () => {...cleanup} }, [])` (fungsi yang di-return adalah cleanup-nya) |
| `ref()` / `reactive()` untuk state lokal | `useState()` |
| template `ref` (handle DOM/elemen) | `useRef()` |

```tsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id); // == onUnmounted
  }, []); // == onMounted, jalan sekali

  return <Text>{seconds}s</Text>;
}
```

## 2. Pemetaan konsep Vue → React Native

### `<slot>` → prop `children`

Slot default di Vue itu ya prop `children` di React — RN memperlakukan `children` sebagai prop biasa (implisit), tidak lebih.

```tsx
// Vue: <Card><slot /></Card>  pemakaian: <Card><Text>Hi</Text></Card>
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
```

Untuk **named slots** Vue (`<template #header>`, `<template #footer>`), React tidak punya sintaks "named slot" terpisah — kamu tinggal kirim lebih banyak prop bernama, masing-masing berisi JSX:

```tsx
function Card({ header, footer, children }: {
  header?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <View>
      {header}
      {children}
      {footer}
    </View>
  );
}
// pemakaian: <Card header={<Header/>} footer={<Footer/>}><Body/></Card>
```

Alternatif umum untuk sub-bagian yang berhubungan erat adalah pola **compound component** (`<Tabs><Tabs.Item/></Tabs>`, parent memeriksa/clone `children`-nya) — tapi named props biasa lebih simpel dan jauh lebih sering dipakai di codebase RN.

### Scoped slot → render prop

Ini pemetaan yang paling penting diingat: **Vue scoped slot == React render prop**. Scoped slot membiarkan child mengembalikan data ke konten slot; render prop adalah prop berupa fungsi yang dipanggil child dengan data tertentu, dan hasil returnnya-lah yang dirender child.

```tsx
// Vue scoped slot: <List :items="items"><template #item="{ item }"><Text>{{ item.name }}</Text></template></List>

// Setara render-prop di RN/React — ini PERSIS cara kerja `renderItem` FlatList:
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.name}</Text>}  // <- render prop, alias "scoped slot"
/>
```

`renderItem` adalah contoh bawaan RN yang paling pas untuk pola ini — tidak butuh fitur bahasa khusus, cuma "prop berupa fungsi yang me-return JSX."

### `defineProps` → tipe TypeScript pada props

`defineProps<{...}>()` Vue (atau bentuk objek runtime-nya) adalah compiler macro untuk mendeklarasikan props bertipe. Di RN tidak ada macro — kamu tinggal tulis type TS dan destructure argumen fungsinya:

```tsx
type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean; // prop optional
};

function Button({ label, onPress, disabled = false }: ButtonProps) {
  // `disabled = false` di sini setara default-value-nya
  // defineProps({ disabled: { type: Boolean, default: false } }) di Vue
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

### Fallthrough attributes → spread `...rest` eksplisit

Vue otomatis meneruskan atribut yang tidak dikenali (`class`, `id`, `data-*`, dll) ke elemen root komponen secara otomatis. **React sama sekali tidak melakukan ini.** Prop apa pun yang tidak di-destructure dan dipakai eksplisit akan langsung hilang — kamu harus spread sendiri:

```tsx
type Props = React.ComponentProps<typeof Pressable> & { label: string };

function MyButton({ label, style, ...rest }: Props) {
  return (
    <Pressable style={style} {...rest}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

Khusus untuk `style`, konvensi RN adalah menerima array dan menggabungkannya, karena `style` bukan single string CSS seperti `class` di web:

```tsx
<View style={[styles.base, isActive && styles.active, style]} />
// StyleSheet.flatten([...]) kalau butuh satu object gabungan saat runtime
```

### `emit` (custom event) → callback props

`emit('change', value)` / `defineEmits` Vue tidak punya padanan RN sebagai fitur bahasa — tidak ada kontrak event-emitter antara parent-child. Kamu cuma kirim fungsi sebagai prop, dan child memanggilnya:

```tsx
// Vue: defineEmits<{ change: [value: string] }>(); emit('change', text)
type Props = { onChange: (value: string) => void };

function Field({ onChange }: Props) {
  return <TextInput onChangeText={onChange} />;
}
// Parent: <Field onChange={(v) => console.log(v)} />
```

Konvensinya: prop RN/React yang berperan seperti event yang di-emit dinamai `onXxx` (`onPress`, `onChangeText`, `onChange`, `onSubmit` custom-mu sendiri, dll) — konvensi penamaan itu **adalah** "sistem event"-nya.

## Sumber
- [React Native Architecture Explained (2026 Edition)](https://medium.com/@silverskytechnology/react-native-architecture-explained-2026-edition-0ca7e4048591)
- [React Native's New Architecture in 2026: Fabric and JSI](https://blog.codercops.com/blog/react-native-new-architecture-fabric-jsi-2026)
- [Vue.js Slots documentation](https://vuejs.org/guide/components/slots.html)
- [Understanding scoped slots in Vue.js - Binarcode](https://www.binarcode.com/blog/understanding-scoped-slots-in-vuejs)
- [Component As Prop — Vue Native](https://vue-native.io/docs/render-prop.html)
