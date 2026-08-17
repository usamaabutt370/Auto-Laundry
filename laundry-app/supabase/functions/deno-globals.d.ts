/** Ambient types for Supabase Edge Functions (Deno runtime). IDE-only; deploy uses Deno on Supabase. */
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: {
    get(key: string): string | undefined;
  };
};
