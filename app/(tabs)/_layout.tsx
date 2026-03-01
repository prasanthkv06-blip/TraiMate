import { View } from 'react-native';
import { Tabs } from 'expo-router';
import TabBar from '../../src/components/TabBar';
import AIGuide from '../../src/components/AIGuide';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="home"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="create" />
        <Tabs.Screen name="trips" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <AIGuide />
    </View>
  );
}
