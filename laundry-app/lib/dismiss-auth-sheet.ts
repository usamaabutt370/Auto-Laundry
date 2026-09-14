import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { Router } from "expo-router";

/**
 * Close the auth modal group, even if login → sign-up (or similar) is stacked
 * inside it. Inner `back()` / `dismiss()` would only reveal the previous auth
 * screen.
 */
export function dismissAuthSheet(
  navigation: NavigationProp<ParamListBase>,
  router: Router,
  returnTo?: string,
) {
  const parent = navigation.getParent();
  if (parent?.canGoBack()) {
    parent.goBack();
    return;
  }

  if (typeof router.canDismiss === "function" && router.canDismiss()) {
    router.dismiss();
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  if (returnTo === "order-summary") {
    router.replace("/(customer)/order-summary");
    return;
  }
  if (returnTo === "chat") {
    router.replace("/(customer)/(tabs)/chat");
    return;
  }
  if (returnTo === "orders") {
    router.replace("/(customer)/(tabs)/order");
    return;
  }
  if (returnTo === "profile") {
    router.replace("/(customer)/(tabs)/profile");
    return;
  }
  router.replace("/(customer)");
}
