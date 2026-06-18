import { Stack } from "expo-router";

import { WebAuthShell } from "@/components/web-shells";

export default function AuthLayout() {
  return (
    <WebAuthShell>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="reset-password" />
    </Stack>
    </WebAuthShell>
  );
}
