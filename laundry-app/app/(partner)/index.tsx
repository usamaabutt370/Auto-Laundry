import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';

/** Laundry partner dashboard – orders and earnings (placeholder). */
export default function PartnerHomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{strings.partner.dashboardTitle}</ThemedText>
      <ThemedText>{strings.partner.dashboardSubtitle}</ThemedText>
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
