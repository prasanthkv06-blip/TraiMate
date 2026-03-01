import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="destination" />
      <Stack.Screen name="category" />
    </Stack>
  );
}
