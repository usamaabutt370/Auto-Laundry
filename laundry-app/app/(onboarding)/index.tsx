import { Redirect } from "expo-router";

/** Intro onboarding slides are iOS-only; web and Android skip straight to auth. */
export default function OnboardingRedirect() {
  return <Redirect href="/(auth)" />;
}
