import { Stack } from "expo-router";

export default function PartnerOnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
      <Stack.Screen
        name="service-other"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="rider-registration" />
    </Stack>
  );
}
