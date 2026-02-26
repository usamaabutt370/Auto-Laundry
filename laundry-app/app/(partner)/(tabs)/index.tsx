import { Redirect } from "expo-router";

/** Partner tabs "Orders" entry: show the main Launderer Dashboard instead of the old placeholder. */
export default function PartnerTabsIndexScreen() {
  return <Redirect href="/(partner)" />;
}
