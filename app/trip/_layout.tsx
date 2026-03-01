import { Stack } from 'expo-router';
import { TripProvider } from '../../src/contexts/TripContext';

export default function TripLayout() {
  return (
    <TripProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="[id]" />
        <Stack.Screen name="stash" />
        <Stack.Screen name="polls" />
        <Stack.Screen name="packing" />
        <Stack.Screen name="visa" />
        <Stack.Screen name="best-time" />
        <Stack.Screen name="budget" />
        <Stack.Screen name="journal" />
        <Stack.Screen name="review" />
      </Stack>
    </TripProvider>
  );
}
