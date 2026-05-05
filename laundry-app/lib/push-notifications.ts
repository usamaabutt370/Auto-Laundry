/** Web stub: FCM is native-only. */

type ForegroundMessage = {
  data?: Record<string, string | undefined>;
  notification?: {
    title?: string;
    body?: string;
  };
};

export async function registerForChatPush(_userId: string): Promise<void> {
  void _userId;
}

export async function unregisterChatPush(_userId: string): Promise<void> {
  void _userId;
}

export function onForegroundChatMessage(
  _handler: (m: ForegroundMessage) => void,
): () => void {
  return () => { };
}
