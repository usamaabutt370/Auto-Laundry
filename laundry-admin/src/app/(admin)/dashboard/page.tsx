import { getAdminDashboardData } from "@/features/admin/server/dashboard/admin-dashboard.repository";
import { theme } from "@/lib/theme/theme";
import Link from "next/link";
import type { ReactNode } from "react";

type CardTone = "default" | "warning" | "danger";

export default async function DashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <section className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">
          Dashboard
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Real-time platform overview from Supabase data.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-[16px] font-bold text-white sm:text-[18px]">Quick Stats</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Orders" value={data.quickStats.totalOrders} />
          <StatCard label="Active Orders" value={data.quickStats.activeOrders} />
          <StatCard label="Total Customers" value={data.quickStats.totalCustomers} />
          <StatCard label="Total Partners" value={data.quickStats.totalPartners} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-bold text-white sm:text-[18px]">Needs Attention</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.needsAttention.map((item) => (
            <ActionCard
              key={item.label}
              label={item.label}
              value={item.value}
              href={item.href}
              tone={item.tone}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-bold text-white sm:text-[18px]">Recent Activity</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          <ActivityCard title="Recent Orders">
            {data.recentOrders.length === 0 ? (
              <EmptyRow />
            ) : (
              data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-1 rounded-xl border px-3 py-2.5 sm:grid-cols-[1.4fr_1fr_0.8fr]"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  <span className="text-[13px] text-white">{order.customerName}</span>
                  <span className="text-[12px] text-white/80">{order.status}</span>
                  <span className="text-[12px] text-white/70 sm:text-right">{order.createdAt}</span>
                </div>
              ))
            )}
          </ActivityCard>

          <ActivityCard title="Recent KYC Submissions">
            {data.recentKycSubmissions.length === 0 ? (
              <EmptyRow />
            ) : (
              data.recentKycSubmissions.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-1 rounded-xl border px-3 py-2.5 sm:grid-cols-[1.2fr_1.1fr_0.8fr_0.7fr]"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  <span className="text-[13px] text-white">{item.partnerName}</span>
                  <span className="text-[12px] text-white/80">{item.businessName}</span>
                  <span className="text-[12px] text-white/70">{item.submittedAt}</span>
                  <span className="text-[12px] text-white/70 sm:text-right">{item.status}</span>
                </div>
              ))
            )}
          </ActivityCard>
        </div>
      </section>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article
      className="rounded-2xl border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.sidebarBackground,
      }}
    >
      <p className="text-[12px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-2 text-[22px] font-bold leading-none text-white sm:text-[26px]">
        {formatInteger(value)}
      </p>
    </article>
  );
}

function ActionCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: CardTone;
}) {
  const toneStyle = actionToneStyle(tone);

  return (
    <Link
      href={href}
      className="rounded-2xl border px-4 py-4 transition hover:brightness-110 sm:px-5 sm:py-5"
      style={{
        borderColor: toneStyle.borderColor,
        backgroundColor: toneStyle.backgroundColor,
      }}
    >
      <p className="text-[12px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-2 text-[22px] font-bold leading-none text-white sm:text-[26px]">
        {formatInteger(value)}
      </p>
      <p className="mt-3 text-[12px] text-white/70">Open {label.toLowerCase()} →</p>
    </Link>
  );
}

function ActivityCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.sidebarBackground,
      }}
    >
      <h3 className="text-[14px] font-semibold text-white sm:text-[16px]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </article>
  );
}

function EmptyRow() {
  return (
    <div
      className="rounded-xl border px-3 py-3 text-sm text-white/75"
      style={{ borderColor: "rgba(255,255,255,0.15)" }}
    >
      None
    </div>
  );
}

function formatInteger(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString();
}

function actionToneStyle(tone: CardTone): { borderColor: string; backgroundColor: string } {
  if (tone === "warning") {
    return {
      borderColor: "rgba(246, 211, 107, 0.7)",
      backgroundColor: "rgba(246, 211, 107, 0.14)",
    };
  }
  if (tone === "danger") {
    return {
      borderColor: "rgba(241, 140, 140, 0.7)",
      backgroundColor: "rgba(241, 140, 140, 0.14)",
    };
  }
  return {
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.sidebarBackground,
  };
}
