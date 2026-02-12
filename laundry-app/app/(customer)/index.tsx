import { Redirect } from "expo-router";

/** Customer entry: show main tabs (home). */
export default function CustomerIndex() {
  return <Redirect href="/(customer)/(tabs)" />;
}
