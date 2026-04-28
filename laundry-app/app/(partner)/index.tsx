import { Redirect } from "expo-router";

/** Redirect bare /(partner)/index to the tabs so the tab bar is always visible. */
export default function PartnerRoot() {
  return <Redirect href="/(partner)/(tabs)" />;
}
