import { Stack } from "expo-router";

export default function PartnerOnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
      <Stack.Screen name="service-other" />
      <Stack.Screen name="rider-registration" />
    </Stack>
  );
}
