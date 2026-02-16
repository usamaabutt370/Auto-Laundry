import { Redirect } from "expo-router";

/** Auth entry: go directly to login (welcome kept but not used for now). */
export default function AuthIndexScreen() {
  return <Redirect href="/(auth)/login" />;
}
