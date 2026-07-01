import type { Router } from "expo-router";

const CUSTOMER_HOME_HREF = "/(customer)/(tabs)" as const;

export function goBackToCustomerHome(router: Router) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(CUSTOMER_HOME_HREF);
}
