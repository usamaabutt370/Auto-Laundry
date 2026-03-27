import { theme } from "@/lib/theme/theme";

type PageShellProps = {
  title: string;
  description: string;
};

export function PageShell({ title, description }: PageShellProps) {
  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: theme.colors.filledButtonBorder,
        backgroundColor: "rgba(0,0,0,0.04)",
      }}
    >
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
