import { Redirect } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { LandingPage } from "@/components/landing";
import { useAuth } from "@/contexts/auth-context";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";

/**
 * Root entry: redirects to onboarding, auth, or app based on state.
 * Flow: onboarding (first time, iOS only) → auth → customer/partner.
 */
export default function IndexScreen() {
  const { hasCompleted: onboardingComplete } = useOnboardingComplete();
  const { isLoading, isAuthenticated, role } = useAuth();

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

  if (!isAuthenticated) {
    // Web visitors get a marketing landing page instead of dropping straight
    // into the login form; native apps keep the direct-to-login flow.
    if (Platform.OS === "web") {
      return <LandingPage />;
    }
    return <Redirect href="/(auth)" />;
  }

  if (role === "launderer") {
    return <Redirect href="/(partner)" />;
  }

  // Default to customer when logged in (role can be null until backend returns it)
  return <Redirect href="/(customer)" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
