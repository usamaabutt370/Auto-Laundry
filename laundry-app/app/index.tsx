import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

/**
 * Root entry: redirects to (auth), (customer), or (partner) based on auth state.
 * Keeps navigation in sync with session and role.
 */
export default function IndexScreen() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (role === 'partner') {
    return <Redirect href="/(partner)" />;
  }

  // Default to customer when logged in (role can be null until backend returns it)
  return <Redirect href="/(customer)" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
