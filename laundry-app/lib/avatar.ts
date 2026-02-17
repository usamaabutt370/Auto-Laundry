/**
 * Append a cache-busting query param to a profile image URL so that when the
 * same storage path is overwritten (e.g. new avatar upload), the app loads the
 * new image instead of a cached old one. Use profile.updated_at so both
 * profile and edit-profile screens stay in sync.
 */
export function avatarUrlWithCacheBuster(
  url: string | null | undefined,
  updatedAt?: string | null,
): string | undefined {
  if (!url || !url.trim()) return undefined;
  const t = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${t}`;
}
