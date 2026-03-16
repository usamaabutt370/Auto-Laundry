import { useEffect } from "react";
import { useRouter } from "expo-router";

/** Partner tabs "Orders" entry: show the main Launderer Dashboard instead of the old placeholder. */
export default function PartnerTabsIndexScreen() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/(partner)");
    }, 0);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
