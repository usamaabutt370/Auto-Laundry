import { Stack } from "expo-router";

/**
 * Partner area: onboarding (when first becoming a launderer) and main tabs.
 * Root redirects partners to (partner)/(tabs). Profile switch sends new launderers to (partner)/onboarding.
 */
export default function PartnerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
