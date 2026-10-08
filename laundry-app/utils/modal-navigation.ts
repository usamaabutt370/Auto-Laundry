import type { Href } from "expo-router";
import type { useRouter } from "expo-router";

import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Dismiss every modal/sheet, then open a fresh modal (e.g. order confirmation).
 * Use after stacking schedule → review so leftover sheets are cleared.
 */
export function openModalAfterDismissingAll(router: AppRouter, href: Href) {
  try {
    if (typeof router.dismissAll === "function") {
      router.dismissAll();
    } else if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    }
  } catch {
    // ignore
  }
  runAfterModalTeardown(() => {
    router.push(href);
  });
}
