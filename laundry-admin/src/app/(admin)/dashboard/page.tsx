import { DashboardBalanceCard } from "@/features/admin/components/dashboard-balance-card";
import { DashboardHeader } from "@/features/admin/components/dashboard-header";
import { DashboardOverviewCard } from "@/features/admin/components/dashboard-overview-card";
import { DashboardSummaryCard } from "@/features/admin/components/dashboard-summary-card";
import { fetchDashboardDemoData } from "@/features/admin/data/dashboard-demo-data";
import { theme } from "@/lib/theme/theme";

function parseCurrency(value: string): number {
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export default async function DashboardPage() {
  const data = await fetchDashboardDemoData();

  return (
    <section className="flex flex-col gap-4 sm:gap-5">
      <DashboardHeader
        eyebrow={undefined}
        title={data.title}
        subtitle=""
        actionLabel={data.timeFilter}
      />

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
      </section>

      <div className="grid shrink-0 gap-3 xl:grid-cols-2">
        {data.overviewCards.map((card) => (
          (() => {
            const summaryMatch = data.summaryCards.find((item) => item.id === card.id);
            // Partner earnings are a payout share, not the admin summary revenue figure.
            const partnerEarningAmount = summaryMatch ? Math.round(parseCurrency(summaryMatch.value) * 0.7) : 0;
            const earningsPoint = summaryMatch ? [`Total partner earnings: ${formatCurrency(partnerEarningAmount)}`] : [];
            return (
          <DashboardOverviewCard
            key={card.id}
            title={card.title}
            value={String(card.total)}
            items={[
              ...card.services.map((service) => `${service.label}: ${service.count}`),
              ...earningsPoint,
            ]}
          />
            );
          })()
        ))}
      </div>

      <section className="flex flex-col gap-3">
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
