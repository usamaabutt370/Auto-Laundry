import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";

type PageShellProps = {
  title: string;
  description: string;
  /** Defaults to product name for consistent admin branding. Pass `null` to hide. */
  eyebrow?: string | null;
};

export function PageShell({ title, description, eyebrow = PRODUCT_NAME }: PageShellProps) {
  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: theme.colors.filledButtonBorder,
        backgroundColor: "rgba(0,0,0,0.04)",
      }}
    >
      {eyebrow ? (
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55 sm:text-xs"
          style={{ fontFamily: theme.fontFamilies.text }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        className="text-2xl sm:text-3xl"
        style={{ color: theme.colors.themeWhite, fontWeight: theme.fontWeights.semibold }}
      >
        {title}
      </h1>
      <p className="mt-2 text-sm sm:text-base" style={{ color: "rgba(255,255,255,0.80)" }}>
        {description}
      </p>
    </section>
  );
}
