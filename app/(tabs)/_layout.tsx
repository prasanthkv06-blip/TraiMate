import { View } from 'react-native';
import { Tabs } from 'expo-router';
import TabBar from '../../src/components/TabBar';
import AIGuide from '../../src/components/AIGuide';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="explore"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="create" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen
          name="home"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <AIGuide />
    </View>
  );
}
