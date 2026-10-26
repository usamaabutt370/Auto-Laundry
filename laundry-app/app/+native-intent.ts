import { nativeIntentPath } from "@/lib/launderer-share-link";

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return nativeIntentPath(path);
  } catch {
    return "/";
  }
}
