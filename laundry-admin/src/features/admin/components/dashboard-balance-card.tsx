 "use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts";
import { theme } from "@/lib/theme/theme";

type DashboardBalanceCardProps = {
  amount: string;
  labels: string[];
  points: number[];
  className?: string;
};

export function DashboardBalanceCard({
  amount,
  labels,
  points,
  className = "",
}: DashboardBalanceCardProps) {
  const chartData = useMemo(
    () => labels.map((label, index) => ({ label, value: points[index] ?? 0 })),
    [labels, points],
  );

  return (
    <section
      className={`flex min-h-0 select-none flex-col justify-between border px-4 py-4 sm:px-7 sm:py-6 ${className}`.trim()}
      style={{
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.sidebarBackground,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className="shrink-0">
        <p className="text-[18px] font-bold text-white sm:text-[22px]">Balance</p>
        <p className="mt-2 text-[36px] leading-[1] font-bold text-white sm:text-[50px]">{amount}</p>
      </div>

      <div className="pointer-events-none mt-auto h-[190px] touch-none px-4 pt-4 sm:h-[245px] sm:px-10 sm:pt-5">
        <div className="h-full overflow-hidden [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceAreaFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#78D8EB" stopOpacity={0.82} />
                  <stop offset="100%" stopColor="#78D8EB" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={10}
                height={28}
                padding={{ left: 8, right: 8 }}
                tick={{ fill: "rgba(255, 255, 255, 0.75)", fontSize: 14 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#95DCEB"
                strokeWidth={2}
                strokeOpacity={0.55}
                fill="url(#balanceAreaFill)"
                animationDuration={700}
                dot={false}
                activeDot={false}
                isAnimationActive
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </section>
  );
}
