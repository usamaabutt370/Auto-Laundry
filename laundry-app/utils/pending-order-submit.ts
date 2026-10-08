/**
 * One-shot flag: guest started checkout → auth → return to order-summary and
 * auto-submit. Survives auth sheet dismiss (order-summary often stays mounted).
 */
let pendingAutoSubmit = false;

export function requestPendingOrderSubmitAfterAuth() {
  pendingAutoSubmit = true;
}

export function clearPendingOrderSubmitAfterAuth() {
  pendingAutoSubmit = false;
}

export function consumePendingOrderSubmitAfterAuth(): boolean {
  if (!pendingAutoSubmit) return false;
  pendingAutoSubmit = false;
  return true;
}
