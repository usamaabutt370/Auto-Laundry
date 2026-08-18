import { InteractionManager } from "react-native";

const MODAL_TEARDOWN_MS = 320;

/**
 * Run work after RN Modal hosts have had time to tear down on iOS.
 * Avoids invisible touch-blocking overlays when navigating after a Modal.
 */
export function runAfterModalTeardown(action: () => void, delayMs = MODAL_TEARDOWN_MS) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, delayMs);
  });
}

