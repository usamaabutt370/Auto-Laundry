import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';

/** Placeholder: will be replaced by real phone number input + send OTP. */
export default function PhoneScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{strings.auth.phoneTitle}</ThemedText>
      <ThemedText>{strings.auth.phoneSubtitle}</ThemedText>
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
