import Image from "next/image";
import { theme } from "@/lib/theme/theme";

type DashboardOverviewCardProps = {
  title: string;
  value: string;
  items: string[];
};

export function DashboardOverviewCard({
  title,
  value,
  items,
}: DashboardOverviewCardProps) {
  const borderColor = "rgba(160, 208, 233, 0.55)";
  const textSoft = "rgba(233, 247, 252, 0.85)";
  const circleColor = theme.colors.outline;

  return (
    <article
      className="grid gap-5 border px-5 py-6 sm:grid-cols-[168px_1fr] sm:items-center"
      style={{ borderColor, backgroundColor: theme.colors.sidebarBackground }}
    >
      <div className="flex justify-center">
        <div
          className="flex h-[112px] w-[112px] flex-col items-center justify-center gap-2 rounded-full border-4"
          style={{ borderColor: circleColor }}
        >
          <p className="text-[13px] leading-[1.1] font-semibold" style={{ color: circleColor }}>
            {title}
          </p>
          <p
            className="text-[38px] leading-[1.05]"
            style={{ color: circleColor }}
          >
            {value}
          </p>
        </div>
      </div>

      <div
        className="space-y-2 sm:border-l sm:pl-7"
        style={{ borderColor: "rgba(255,255,255,0.22)" }}
      >
        {items.map((item) => (
          <p
            key={item}
            className="flex items-center gap-2 text-[14px]"
            style={{ color: textSoft }}
          >
            <Image src="/icons/service-bullet.svg" alt="" width={12} height={12} />
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
