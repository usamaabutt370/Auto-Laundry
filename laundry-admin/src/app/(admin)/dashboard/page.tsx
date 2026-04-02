import { DashboardBalanceCard } from "@/features/admin/components/dashboard-balance-card";
import { DashboardHeader } from "@/features/admin/components/dashboard-header";
import { DashboardOverviewCard } from "@/features/admin/components/dashboard-overview-card";
import { DashboardSummaryCard } from "@/features/admin/components/dashboard-summary-card";
import { fetchDashboardDemoData } from "@/features/admin/data/dashboard-demo-data";
import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";

export default async function DashboardPage() {
  const data = await fetchDashboardDemoData();

  return (
    <section className="flex flex-col gap-4 sm:gap-5">
      <DashboardHeader
        eyebrow={PRODUCT_NAME}
        title={data.title}
        subtitle={`Number of users: ${data.userCount}`}
        actionLabel={data.timeFilter}
      />

      <div className="grid shrink-0 gap-3 xl:grid-cols-2">
        {data.overviewCards.map((card) => (
          <DashboardOverviewCard
            key={card.id}
            title={card.title}
            value={String(card.total)}
            items={card.services.map((service) => `${service.label}: ${service.count}`)}
          />
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2
          className="text-[18px] font-bold sm:text-[20px]"
          style={{ color: theme.colors.white }}
        >
          Summary
        </h2>
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.summaryCards.map((item) => (
            <DashboardSummaryCard key={item.id} label={item.label} amount={item.value} />
          ))}
        </div>
        <DashboardBalanceCard
          amount={data.balance.amount}
          labels={data.balance.labels}
          points={data.balance.points}
          className="min-h-[330px] sm:min-h-[380px] lg:flex-1"
        />
      </section>
    </section>
  );
}
