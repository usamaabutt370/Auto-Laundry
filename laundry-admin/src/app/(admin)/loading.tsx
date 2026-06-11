export default function AdminLoading() {
  return (
    <div className="w-full min-w-0 space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
      <div className="h-11 w-full max-w-md animate-pulse rounded-xl bg-white/10" />
      <div className="h-64 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}
