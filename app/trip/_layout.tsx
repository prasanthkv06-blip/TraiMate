import { Stack } from 'expo-router';

export default function TripLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="polls" />
      <Stack.Screen name="packing" />
      <Stack.Screen name="visa" />
      <Stack.Screen name="best-time" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="journal" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
