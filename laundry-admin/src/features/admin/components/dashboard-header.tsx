import Image from "next/image";
import { theme } from "@/lib/theme/theme";

type DashboardHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  eyebrow?: string;
};

export function DashboardHeader({
  title,
  subtitle,
  actionLabel = "Week",
  eyebrow,
}: DashboardHeaderProps) {
  const borderColor = "rgba(160, 208, 233, 0.55)";
  const textSoft = "rgba(233, 247, 252, 0.85)";

  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/55 sm:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="text-[20px] sm:text-[22px]"
          style={{ color: theme.colors.white, fontWeight: theme.fontWeights.bold }}
        >
          {title}
        </h1>
        <p className="mt-2 text-[18px]" style={{ color: textSoft }}>
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        className="flex h-[44px] min-w-[136px] items-center justify-center gap-3 rounded-full border px-5 text-[18px]"
        style={{ borderColor, color: textSoft }}
      >
        {actionLabel}
        <Image src="/icons/right-arrow.svg" alt="" width={14} height={8} />
      </button>
    </header>
  );
}
