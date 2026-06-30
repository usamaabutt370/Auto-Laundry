"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { theme } from "@/lib/theme/theme";
import { loginAction } from "../actions/login-action";

const cardStyle = {
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "transparent",
} as const;

const titleStyle = {
  color: theme.colors.themeWhite,
  fontFamily: theme.fontFamilies.boldTitle,
  fontWeight: theme.fontWeights.semibold,
  letterSpacing: 0.4,
} as const;

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center p-3 sm:p-6 md:p-8">
      <section
        className="login-container flex w-full max-w-[600px] flex-col justify-center rounded-2xl border px-4 py-6 sm:px-8 sm:py-10 md:px-10 md:py-12"
        style={cardStyle}
      >
        <h1
          className="mb-6 text-center text-[clamp(1.9rem,7vw,2.875rem)] sm:mb-10"
          style={titleStyle}
        >
          Auto laundry
        </h1>

        <form
          className="mx-auto w-full max-w-[340px] space-y-3.5 sm:space-y-5"
          action={action}
        >
          <Input
            type="text"
            name="username"
            placeholder="Username"
            autoComplete="username"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className="pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
                  <path
                    d="M3 3l18 18M10.58 10.58A2 2 0 0013.42 13.42M9.88 4.24A10.94 10.94 0 0112 4c5.5 0 9.5 4 10 8a10.5 10.5 0 01-3.04 5.22M6.1 6.1A11.02 11.02 0 002 12c.5 4 4.5 8 10 8 1.68 0 3.2-.37 4.55-1.01"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
                  <path
                    d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>

          {state?.error ? (
            <p className="text-center text-sm text-red-400">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            className="mt-6 sm:mt-8"
            disabled={isPending}
          >
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </section>
    </main>
  );
}
