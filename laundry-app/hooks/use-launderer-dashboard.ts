import { useCallback, useEffect, useState } from "react";

import type { LaundererDashboardData } from "@/types/dashboard";
import { ZERO_DASHBOARD_DATA } from "@/types/dashboard";
import type { DashboardPeriod } from "@/components/dashboard-period-selector";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

export interface UseLaundererDashboardResult {
  data: LaundererDashboardData;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

type ChartValues = [number, number, number, number, number, number, number];
type ChartLabels = [string, string, string, string, string, string, string];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const offset = (day + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toChartValues(values: number[]): ChartValues {
  return values as ChartValues;
}

function toChartLabels(values: string[]): ChartLabels {
  return values as ChartLabels;
}

function buildChartBuckets(
  period: DashboardPeriod,
  now: Date,
): { starts: Date[]; labels: ChartLabels } {
  if (period === "year") {
    const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
    const currentMonthStart = startOfMonth(now);
    const starts = Array.from({ length: 7 }, (_, i) => addMonths(currentMonthStart, i - 6));
    return { starts, labels: toChartLabels(starts.map((d) => monthFmt.format(d))) };
  }

  if (period === "month") {
    const weekFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const currentWeekStart = startOfWeekMonday(now);
    const starts = Array.from({ length: 7 }, (_, i) => addWeeks(currentWeekStart, i - 6));
    return { starts, labels: toChartLabels(starts.map((d) => weekFmt.format(d))) };
  }

  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const todayStart = startOfDay(now);
  const starts = Array.from({ length: 7 }, (_, i) => addDays(todayStart, i - 6));
  return { starts, labels: toChartLabels(starts.map((d) => dayFmt.format(d))) };
}

function findBucketIndex(starts: Date[], valueDate: Date): number {
  const value = valueDate.getTime();
  for (let i = 0; i < starts.length; i++) {
    const startMs = starts[i].getTime();
    const nextStartMs = starts[i + 1]?.getTime();
    if (nextStartMs == null) {
      if (value >= startMs) return i;
      continue;
    }
    if (value >= startMs && value < nextStartMs) return i;
  }
  return -1;
}

/**
 * Returns launderer dashboard data for the Partner Dashboard screen.
 *
 * For now: returns demo data so the graph and stats are visible. Replace with
 * backend fetch in useLaundererDashboard when API/table is ready – see docs/PARTNER-DASHBOARD.md.
 */
export function useLaundererDashboard(
  enabled: boolean,
  period: DashboardPeriod = "week"
): UseLaundererDashboardResult {
  const { user } = useAuth();
  const [data, setData] = useState<LaundererDashboardData>(ZERO_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !user?.id || !supabase) {
      setData(ZERO_DASHBOARD_DATA);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error: ordersError } = await supabase
        .from("customer_orders")
        .select(
          "id,status,estimated_total,estimated_partial_total,pickup_fee,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label,submitted_at,created_at,updated_at"
        )
        .eq("partner_id", user.id);

      if (ordersError) throw new Error(ordersError.message);

      const rows = orders ?? [];

      // Active drop-off / delivery orders for high-level workload stats:
      // exclude completed / rejected so cards reflect current work.
      const isActive = (status: string) =>
        status !== "completed" && status !== "rejected" && status !== "cancelled";

      const dropOffOrders = rows.filter(
        (row) =>
          isActive(row.status) &&
          !row.pickup_day_label &&
          !row.pickup_time_slot_label
      );
      const deliveryOrders = rows.filter(
        (row) =>
          isActive(row.status) &&
          (row.pickup_day_label || row.pickup_time_slot_label)
      );

      // Income must be permanent and based on completed work only.
      const completedOrders = rows.filter((row) => row.status === "completed");
      const completedDropOffOrders = completedOrders.filter(
        (row) => !row.pickup_day_label && !row.pickup_time_slot_label
      );
      const completedDeliveryOrders = completedOrders.filter(
        (row) => Boolean(row.pickup_day_label || row.pickup_time_slot_label)
      );

      const totalFrom = (list: typeof rows) =>
        list.reduce((sum, row) => {
          const base =
            row.estimated_total ?? row.estimated_partial_total ?? 0;
          const pickupFee = row.pickup_fee ?? 0;
          return sum + Number(base) + Number(pickupFee);
        }, 0);

      const totalIncome = totalFrom(completedOrders);
      const dropOffIncome = totalFrom(completedDropOffOrders);
      const deliveryIncome = totalFrom(completedDeliveryOrders);

      const partnerIds = Array.from(
        new Set(rows.map((_row) => user.id))
      );

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", partnerIds);

      if (profilesError) throw new Error(profilesError.message);

      const numberOfUsers = profiles?.length ?? 0;

      const breakDownServices = async (orderIds: string[]) => {
        if (orderIds.length === 0 || !supabase) {
          return { washAndFold: 0, dryCleaning: 0, tailoring: 0 };
        }

        const { data: services, error: servicesError } = await supabase
          .from("order_services")
          .select("order_id,service_type")
          .in("order_id", orderIds);

        if (servicesError) throw new Error(servicesError.message);

        const result = { washAndFold: 0, dryCleaning: 0, tailoring: 0 };
        for (const service of services ?? []) {
          if (service.service_type === "washAndFold") result.washAndFold += 1;
          else if (service.service_type === "dryCleaning") result.dryCleaning += 1;
          else if (service.service_type === "tailoring") result.tailoring += 1;
        }
        return result;
      };

      const dropOffIds = dropOffOrders.map((o) => o.id);
      const deliveryIds = deliveryOrders.map((o) => o.id);
      const [dropOffServices, deliveryServices] = await Promise.all([
        breakDownServices(dropOffIds),
        breakDownServices(deliveryIds),
      ]);

      const now = new Date();
      const { starts: chartBucketStarts, labels: chartLabels } = buildChartBuckets(period, now);
      const earningsChartValues = [0, 0, 0, 0, 0, 0, 0];

      const getOrderEarningAmount = (row: (typeof completedOrders)[number]): number => {
        const base = row.estimated_total ?? row.estimated_partial_total ?? 0;
        const pickupFee = row.pickup_fee ?? 0;
        return Number(base) + Number(pickupFee);
      };
      const getOrderTimelineDate = (row: (typeof completedOrders)[number]): Date | null => {
        const raw = row.submitted_at ?? row.created_at ?? row.updated_at ?? null;
        if (!raw) return null;
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      for (const row of completedOrders) {
        const timelineDate = getOrderTimelineDate(row);
        if (!timelineDate) continue;
        const bucketIndex = findBucketIndex(chartBucketStarts, timelineDate);
        if (bucketIndex < 0 || bucketIndex > 6) continue;
        earningsChartValues[bucketIndex] += getOrderEarningAmount(row);
      }

      const recentCompletedEarnings = completedOrders
        .map((row) => ({
          orderId: row.id ? String(row.id) : "unknown",
          earnedAmount: getOrderEarningAmount(row),
          earnedAtIso:
            getOrderTimelineDate(row)?.toISOString() ?? new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.earnedAtIso).getTime() - new Date(a.earnedAtIso).getTime())
        .slice(0, 2);

      const nextData: LaundererDashboardData = {
        numberOfUsers,
        dropOff: {
          total: dropOffOrders.length,
          washAndFold: dropOffServices.washAndFold,
          dryCleaning: dropOffServices.dryCleaning,
          tailoring: dropOffServices.tailoring,
        },
        delivery: {
          total: deliveryOrders.length,
          washAndFold: deliveryServices.washAndFold,
          dryCleaning: deliveryServices.dryCleaning,
          tailoring: deliveryServices.tailoring,
        },
        totalIncome,
        dropOffIncome,
        deliveryIncome,
        earningsChartValues: toChartValues(earningsChartValues),
        chartLabels,
        recentCompletedEarnings,
      };

      setData(nextData);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      setError(e);
      setData(ZERO_DASHBOARD_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, period, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
