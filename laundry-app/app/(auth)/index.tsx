import { Redirect } from "expo-router";

/** Auth entry: welcome first, then login → OTP → role-select. */
export default function AuthIndexScreen() {
  return <Redirect href="/(auth)/welcome" />;
}
