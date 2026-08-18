import { Redirect } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { LandingPage } from "@/components/landing";
import { useAuth } from "@/contexts/auth-context";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";

/**
 * Root entry: redirects to onboarding or app based on state.
 * Flow: onboarding (first time, native) → customer home (login deferred).
 */
export default function IndexScreen() {
  const { hasCompleted: onboardingComplete } = useOnboardingComplete();
  const { isLoading, isAuthenticated, role } = useAuth();

  // On web, show the landing page immediately — don't make visitors wait for
  // a Supabase session check before seeing anything. If auth resolves to
  // "authenticated", the component re-renders and redirects below.
  if (Platform.OS === "web" && (isLoading || !isAuthenticated)) {
    return <LandingPage />;
  }

  if (onboardingComplete === null || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (Platform.OS !== "web" && !onboardingComplete) {
    return <Redirect href="/(onboarding)" />;
  }

  if (isAuthenticated && role === "launderer") {
    return <Redirect href="/(partner)" />;
  }

  // After onboarding (or when logged in as customer), go to home
  return <Redirect href="/(customer)" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
