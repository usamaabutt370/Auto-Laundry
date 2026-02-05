import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';

/** Placeholder: will be replaced by phone number login screen. */
export default function AuthScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{strings.auth.entryTitle}</ThemedText>
      <ThemedText>{strings.auth.entrySubtitle}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
});
