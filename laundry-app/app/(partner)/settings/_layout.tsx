import { Stack } from "expo-router";

/**
 * Settings stack: Screen 1 (index), Screen 2 (add-service), Screen 3 (edit-service).
 * All screens use headerShown: false and render their own header + red screen label.
 */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-service" />
      <Stack.Screen name="edit-service" />
    </Stack>
  );
}
