import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home' }} size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Todos',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'checklist', android: 'checklist' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'person.fill', android: 'person' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="storage-playground"
        options={{
          title: 'Storage playground',
          // Reachable via the Link on Profile, not a bottom tab item.
          href: null,
        }}
      />
    </Tabs>
  );
}
