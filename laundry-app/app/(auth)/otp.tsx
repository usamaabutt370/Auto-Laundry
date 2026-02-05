import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';

/** Placeholder: will be replaced by OTP verification screen. */
export default function OtpScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{strings.auth.otpTitle}</ThemedText>
      <ThemedText>{strings.auth.otpSubtitle}</ThemedText>
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
