"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { theme } from "@/lib/theme/theme";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

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
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
      <section
        className="login-container flex w-full max-w-[600px] min-h-[420px] flex-col justify-center rounded-2xl border px-5 py-8 sm:min-h-[480px] sm:px-8 sm:py-10 md:min-h-[520px] md:px-10 md:py-12"
        style={cardStyle}
      >
        <h1
          className="mb-8 text-center text-4xl sm:mb-10 sm:text-[46px]"
          style={titleStyle}
        >
          Auto laundry
        </h1>

        <form
          className="mx-auto w-full max-w-[320px] space-y-4 sm:space-y-5"
          onSubmit={handleSubmit}
        >
          <Input
            type="text"
            name="username"
            placeholder="Username"
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
          />

          <Button
            type="submit"
            className="mt-6 sm:mt-8"
          >
            Sign In
          </Button>
        </form>
      </section>
    </main>
  );
}
