import { DashboardHeader } from "@/features/admin/components/dashboard-header";
import { DashboardOverviewCard } from "@/features/admin/components/dashboard-overview-card";
import { fetchDashboardDemoData } from "@/features/admin/data/dashboard-demo-data";

export default async function DashboardPage() {
  const data = await fetchDashboardDemoData();

  return (
    <section className="space-y-6">
      <DashboardHeader
        title={data.title}
        subtitle={`Number of Users : ${data.userCount}`}
        actionLabel={data.timeFilter}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {data.overviewCards.map((card) => (
          <DashboardOverviewCard
            key={card.id}
            title={card.title}
            value={String(card.total)}
            items={card.services.map((service) => `${service.label}: ${service.count}`)}
          />
        ))}
      </div>

      {/* <section>
        <h2 className="mb-4 text-[30px]" style={{ color: theme.colors.themeWhite }}>
          Summary
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Total Income", value: "$7,240" },
            { label: "Drop Off", value: "$2,890" },
            { label: "Delivery", value: "$3,359" },
          ].map((item) => (
            <article
              key={item.label}
              className="flex items-center gap-4 border px-5 py-5"
              style={{ borderColor }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9FD7E8] text-[28px] text-[#167F96]">
                $
              </span>
              <div>
                <p className="text-[16px]" style={{ color: textSoft }}>
                  {item.label}
                </p>
                <p className="text-[54px] leading-[1] text-white">{item.value}</p>
              </div>
            </article>
          ))}
        </div>
      </section> */}

      {/* <section className="border px-7 py-6" style={{ borderColor }}>
        <p className="text-[30px]" style={{ color: textSoft }}>
          Balance
        </p>
        <p className="mt-2 text-[58px] leading-[1] text-white">$27,240</p>

        <div className="mt-6">
          <svg viewBox="0 0 900 300" className="h-[300px] w-full">
            <defs>
              <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#5EC7DF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#5EC7DF" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <path
              d="M20,250 C90,110 130,110 210,220 C280,310 340,280 420,160 C500,40 560,40 640,110 C720,180 780,170 860,165 L860,260 L20,260 Z"
              fill="url(#areaFill)"
            />
            <path
              d="M20,250 C90,110 130,110 210,220 C280,310 340,280 420,160 C500,40 560,40 640,110 C720,180 780,170 860,165"
              fill="none"
              stroke="#7BD5E9"
              strokeWidth="2"
              strokeOpacity="0.65"
            />
          </svg>
        </div>

        <div className="mt-2 grid grid-cols-7 text-center text-[32px]" style={{ color: textMuted }}>
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
          <span>S</span>
        </div>
      </section> */}
    </section>
  );
}
