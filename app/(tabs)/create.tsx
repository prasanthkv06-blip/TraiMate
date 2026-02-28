import { View, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/theme';

export default function CreateScreen() {
  // This tab is never shown — the + button in TabBar opens
  // the create-trip modal directly via router.push('/create-trip')
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
