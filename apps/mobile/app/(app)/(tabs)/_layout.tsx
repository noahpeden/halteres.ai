import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0b0b0e', borderTopColor: '#27272a' },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#71717a',
        headerStyle: { backgroundColor: '#0b0b0e' },
        headerTintColor: '#f4f4f5',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color }) => <Icon label="🏋️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Icon label="📈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Icon label="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
