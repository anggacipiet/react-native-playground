import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ASYNC_STORAGE_KEY = 'storage-playground.note';
// SecureStore keys may only contain alphanumeric characters, ".", "-", "_" — no "/".
const SECURE_STORE_KEY = 'storage-playground.secret';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-xl border border-slate-200 p-4">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-lg bg-slate-900 px-3 py-2 active:opacity-80">
      <Text className="text-center text-sm font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function AsyncStorageDemo() {
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const value = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    setSaved(value);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, draft);
    await load();
  };

  const clear = async () => {
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
    setDraft('');
    await load();
  };

  return (
    <Section title="AsyncStorage (plain, unencrypted key-value)">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Tulis catatan..."
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton label="Save" onPress={save} />
        </View>
        <View className="flex-1">
          <ActionButton label="Clear" onPress={clear} />
        </View>
      </View>
      <Text className="text-sm text-slate-600">
        Tersimpan: <Text className="font-medium">{saved ?? '(kosong)'}</Text>
      </Text>
    </Section>
  );
}

function SecureStoreDemo() {
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const value = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      setSaved(value);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read SecureStore');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, draft);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write SecureStore');
    }
  };

  const clear = async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    setDraft('');
    await load();
  };

  return (
    <Section title="Expo SecureStore (Keystore/Keychain, buat data sensitif kecil)">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Tulis 'secret' pendek..."
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton label="Save" onPress={save} />
        </View>
        <View className="flex-1">
          <ActionButton label="Clear" onPress={clear} />
        </View>
      </View>
      <Text className="text-sm text-slate-600">
        Tersimpan: <Text className="font-medium">{saved ?? '(kosong)'}</Text>
      </Text>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </Section>
  );
}

type NoteRow = { id: number; body: string; created_at: string };

function SqliteDemo() {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<NoteRow[]>([]);

  const load = useCallback(async () => {
    const result = await db.getAllAsync<NoteRow>(
      'SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 10'
    );
    setRows(result);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const insert = async () => {
    if (!draft.trim()) return;
    await db.runAsync('INSERT INTO notes (body, created_at) VALUES (?, ?)', [
      draft,
      new Date().toISOString(),
    ]);
    setDraft('');
    await load();
  };

  const clear = async () => {
    await db.runAsync('DELETE FROM notes');
    await load();
  };

  return (
    <Section title="SQLite (expo-sqlite, relational/query-able)">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Tulis note baru..."
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton label="Insert row" onPress={insert} />
        </View>
        <View className="flex-1">
          <ActionButton label="Delete all" onPress={clear} />
        </View>
      </View>
      <View className="gap-1">
        {rows.length === 0 ? (
          <Text className="text-sm text-slate-500">(belum ada row)</Text>
        ) : (
          rows.map((row) => (
            <Text key={row.id} className="text-sm text-slate-600">
              #{row.id} — {row.body}
            </Text>
          ))
        )}
      </View>
    </Section>
  );
}

export default function StoragePlayground() {
  return (
    <SQLiteProvider databaseName="storage-playground.db" onInit={initDb}>
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView contentContainerClassName="gap-4 px-6 py-6">
          <Text className="text-sm text-slate-500">
            Percobaan langsung AsyncStorage, SecureStore, dan SQLite — lihat docs/learning/05-local-storage.md
            untuk perbandingan lengkapnya.
          </Text>
          <AsyncStorageDemo />
          <SecureStoreDemo />
          <SqliteDemo />
        </ScrollView>
      </SafeAreaView>
    </SQLiteProvider>
  );
}

async function initDb(db: SQLiteDatabase) {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL, created_at TEXT NOT NULL);'
  );
}
