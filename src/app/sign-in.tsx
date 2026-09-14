import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/auth-context';

export default function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="mb-2 text-3xl font-bold text-slate-900">Welcome back</Text>
        <Text className="mb-4 text-base text-slate-500">
          Sign in to manage your todos. This is a mock login, any email works.
        </Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />

        <Pressable
          disabled={!email}
          onPress={() => signIn(email)}
          className="rounded-xl bg-slate-900 py-3 active:opacity-80 disabled:opacity-40">
          <Text className="text-center text-base font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
