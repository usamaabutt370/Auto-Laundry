type Listener = () => void;

const listeners = new Set<Listener>();

/** Call after profile avatar is uploaded or saved so list screens can refetch. */
export function notifyProfileAvatarUpdated() {
  listeners.forEach((listener) => listener());
}

export function subscribeProfileAvatarUpdated(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
