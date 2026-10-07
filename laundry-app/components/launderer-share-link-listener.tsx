import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";

import { parseLaundererShareId } from "@/lib/launderer-share-link";

/** Opens a launderer profile when a share link arrives while the app is already running. */
export function LaundererShareLinkListener() {
  const router = useRouter();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const open = (url: string | null) => {
      if (!url || url === lastUrl.current) return;
      const id = parseLaundererShareId(url);
      if (!id) return;
      lastUrl.current = url;
      router.push({
        pathname: "/(customer)/launderer-detail",
        params: { id },
      });
    };

    const subscription = Linking.addEventListener("url", ({ url }) => open(url));
    return () => subscription.remove();
  }, [router]);

  return null;
}
