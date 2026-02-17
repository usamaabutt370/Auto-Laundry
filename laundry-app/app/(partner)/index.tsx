import { Redirect } from "expo-router";

/** Partner area entry: send to main tabs (onboarding is reached via profile switch). */
export default function PartnerIndex() {
  return <Redirect href="/(partner)/(tabs)" />;
}
