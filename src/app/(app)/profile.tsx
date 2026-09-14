import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/auth-context';

export default function Profile() {
  const { session, signOut } = useSession();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 gap-4 px-6 py-8">
        <View className="gap-1">
          <Text className="text-sm text-slate-500">Signed in as</Text>
          <Text className="text-xl font-semibold text-slate-900">{session}</Text>
        </View>

        <Link href="/storage-playground" asChild>
          <Pressable className="rounded-xl border border-slate-200 bg-slate-50 py-3 active:opacity-80">
            <Text className="text-center text-base font-semibold text-slate-700">
              Storage playground
            </Text>
          </Pressable>
        </Link>

        <Pressable
          onPress={signOut}
          className="rounded-xl border border-red-200 bg-red-50 py-3 active:opacity-80">
          <Text className="text-center text-base font-semibold text-red-600">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
