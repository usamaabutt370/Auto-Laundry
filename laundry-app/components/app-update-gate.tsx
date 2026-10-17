import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { AppUpdateModal } from "@/components/app-update-modal";
import {
  evaluateAppUpdatePrompt,
  openAppStore,
  type AppUpdatePrompt,
} from "@/lib/app-update";

const RECHECK_COOLDOWN_MS = 60_000;

/**
 * Checks remote app update config on launch and when returning to foreground.
 * Shows a blocking store update modal until the installed version matches latest.
 */
export function AppUpdateGate() {
  const [prompt, setPrompt] = useState<AppUpdatePrompt | null>(null);
  const checkingRef = useRef(false);
  const lastCheckAtRef = useRef(0);

  const runCheck = useCallback(async (force = false) => {
    if (Platform.OS === "web") return;
    if (checkingRef.current) return;

    const now = Date.now();
    if (!force && now - lastCheckAtRef.current < RECHECK_COOLDOWN_MS) return;

    checkingRef.current = true;
    lastCheckAtRef.current = now;
    try {
      const next = await evaluateAppUpdatePrompt();
      setPrompt(next);
    } catch {
      // Fail open: never block the app if the check errors.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void runCheck(true);

    const onChange = (state: AppStateStatus) => {
      if (state === "active") void runCheck(false);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [runCheck]);

  const handleUpdate = useCallback(() => {
    if (!prompt?.storeUrl) return;
    void openAppStore(prompt.storeUrl);
  }, [prompt]);

  return <AppUpdateModal prompt={prompt} onUpdate={handleUpdate} />;
}
