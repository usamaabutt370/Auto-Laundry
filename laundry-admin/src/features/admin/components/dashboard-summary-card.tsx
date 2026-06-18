import { theme } from "@/lib/theme/theme";

type DashboardSummaryCardProps = {
  label: string;
  amount: string;
  icon?: string;
};

export function DashboardSummaryCard({
  label,
  amount,
  icon = "$",
}: DashboardSummaryCardProps) {
  const borderColor = theme.colors.outline;
  return (
    <article
      className="flex w-full min-h-[clamp(7rem,18vw,9.375rem)] items-center gap-3 border px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 md:gap-5"
      style={{
        borderColor,
        backgroundColor: theme.colors.sidebarBackground,
      }}
    >
      <span
        className="flex size-[clamp(2.5rem,6vw+1.5rem,3.75rem)] shrink-0 items-center justify-center rounded-full leading-none text-[clamp(1.125rem,2.5vw+0.5rem,1.75rem)]"
        style={{ backgroundColor: theme.colors.outline, color: theme.colors.sidebarBackground }}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold leading-[1.15] text-white [font-size:clamp(0.8125rem,1.8vw+0.35rem,1.0625rem)]">
          {label}
        </p>
        <p className="mt-1.5 font-bold leading-[0.95] text-white [font-size:clamp(1.625rem,4.2vw+0.75rem,2.8125rem)] sm:mt-2">
          {amount}
        </p>
      </div>
    </article>
  );
}
