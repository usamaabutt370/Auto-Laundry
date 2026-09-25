/** One-shot focus request for launderer detail (survives modal dismiss). */
let pendingCollectFocus = false;

export function requestLaundererCollectFocus() {
  pendingCollectFocus = true;
}

export function consumeLaundererCollectFocus(): boolean {
  if (!pendingCollectFocus) return false;
  pendingCollectFocus = false;
  return true;
}
