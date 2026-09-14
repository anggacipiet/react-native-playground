import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/auth-context';

export default function Home() {
  const { session } = useSession();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 justify-center gap-2 px-6">
        <Text className="text-2xl font-bold text-slate-900">Hi, {session} 👋</Text>
        <Text className="text-base text-slate-500">
          You are signed in. Head to the Todos tab to try the CRUD list.
        </Text>
      </View>
    </SafeAreaView>
  );
}
