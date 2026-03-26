import { theme } from "@/theme/theme";

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

const inputStyle = {
  color: theme.colors.white,
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "transparent",
} as const;

const signInButtonStyle = {
  color: theme.colors.themeWhite,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: theme.colors.secondary,
  fontWeight: theme.fontWeights.medium,
} as const;

export default function Home() {
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

        <form className="mx-auto w-full max-w-[320px] space-y-4 sm:space-y-5">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="login-input h-11 w-full rounded-full border px-5 text-sm outline-none sm:h-12"
            style={inputStyle}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="login-input h-11 w-full rounded-full border px-5 text-sm outline-none sm:h-12"
            style={inputStyle}
          />

          <button
            type="submit"
            className="mt-6 h-11 w-full rounded-full text-base sm:mt-8 sm:h-12 sm:text-lg"
            style={signInButtonStyle}
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
