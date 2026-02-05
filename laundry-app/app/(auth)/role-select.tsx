import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';
import { USER_ROLES } from '@/constants/roles';
import type { UserRole } from '@/types/user';

/** Placeholder: will be replaced by real role selection (Customer / Laundry Partner). */
export default function RoleSelectScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{strings.auth.roleSelectTitle}</ThemedText>
      <ThemedText>{strings.auth.roleSelectSubtitle}</ThemedText>
      {USER_ROLES.map((role: UserRole) => (
        <ThemedText key={role} type="defaultSemiBold">
          {strings.auth.roles[role]}
        </ThemedText>
      ))}
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
