import { Stack } from "expo-router";
import { Platform } from "react-native";

import { AuthSheetFrame } from "@/components/auth-sheet-frame";
import { WebAuthShell } from "@/components/web-shells";
import { UI } from "@/constants/theme";

export default function AuthLayout() {
  return (
    <WebAuthShell>
      <AuthSheetFrame>
        <Stack
          screenOptions={{
            headerShown: false,
            // No motion inside the sheet. iOS otherwise replays the parent modal
            // slide on every Sign In ↔ Sign Up replace.
            animation: "none",
            gestureEnabled: false,
            ...(Platform.OS === "ios" ? { presentation: "card" as const } : {}),
            // Android treats a transparent screen as translucent and flashes the
            // dim backdrop for a frame on replace. An opaque sheet color hides that.
            ...(Platform.OS === "android"
              ? { animationTypeForReplace: "push" as const }
              : {}),
            contentStyle: {
              backgroundColor:
                Platform.OS === "android"
                  ? UI.bg
                  : Platform.OS === "web"
                    ? undefined
                    : "transparent",
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="role-select" />
          <Stack.Screen name="reset-password" />
        </Stack>
      </AuthSheetFrame>
    </WebAuthShell>
  );
}
