import { useCallback, useEffect, useRef, useState } from "react";

import type { DashboardPeriod } from "@/components/dashboard-period-selector";
import { useAuth } from "@/contexts/auth-context";
import { addDays, getPeriodCalendarBounds } from "@/lib/dashboard-period-bounds";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { LaundererDashboardData } from "@/types/dashboard";
import { ZERO_DASHBOARD_DATA } from "@/types/dashboard";

export interface UseLaundererDashboardResult {
  data: LaundererDashboardData;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

type ChartValues = [number, number, number, number, number, number, number];
type ChartLabels = [string, string, string, string, string, string, string];

function toChartValues(values: number[]): ChartValues {
  return values as ChartValues;
}

function toChartLabels(values: string[]): ChartLabels {
  return values as ChartLabels;
}

interface CalendarChartModel {
  periodStart: Date;
  periodEndExclusive: Date;
  /** Seven segment starts; each bucket i is [segmentStarts[i], segmentStarts[i+1]) except last ends at periodEndExclusive. */
  segmentStarts: Date[];
  labels: ChartLabels;
}

/**
 * Week: one bucket per calendar day (Mon–Sun). Month/year: seven equal sub-ranges inside the period.
 */
function buildCalendarChartModel(period: DashboardPeriod, now: Date): CalendarChartModel {
  const { start, endExclusive } = getPeriodCalendarBounds(period, now);
  const spanMs = endExclusive.getTime() - start.getTime();

  if (period === "week") {
    const segmentStarts = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    return {
      periodStart: start,
      periodEndExclusive: endExclusive,
      segmentStarts,
      labels: toChartLabels(segmentStarts.map((d) => dayFmt.format(d))),
    };
  }

  const segmentStarts: Date[] = [];
  for (let i = 0; i < 7; i++) {
    segmentStarts.push(new Date(start.getTime() + (spanMs * i) / 7));
  }
  const segFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return {
    periodStart: start,
    periodEndExclusive: endExclusive,
    segmentStarts,
    labels: toChartLabels(segmentStarts.map((d) => segFmt.format(d))),
  };
}

function findSegmentBucketIndex(
  segmentStarts: Date[],
  valueDate: Date,
  periodEndExclusive: Date,
): number {
  const value = valueDate.getTime();
  const p0 = segmentStarts[0].getTime();
  const pEnd = periodEndExclusive.getTime();
  if (value < p0 || value >= pEnd) return -1;
  for (let i = 0; i < 6; i++) {
    const a = segmentStarts[i].getTime();
    const b = segmentStarts[i + 1].getTime();
    if (value >= a && value < b) return i;
  }
  const last = segmentStarts[6].getTime();
  if (value >= last && value < pEnd) return 6;
  return -1;
}

/**
 * Returns launderer dashboard data for the Partner Dashboard screen.
 * Chart buckets and income totals use the selected calendar period (week / month / year).
 */
export function useLaundererDashboard(
  enabled: boolean,
  period: DashboardPeriod = "week"
): UseLaundererDashboardResult {
  const { user } = useAuth();
  const [data, setData] = useState<LaundererDashboardData>(ZERO_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  /** Bumps when a new refresh starts so stale async work does not overwrite state (e.g. rapid period changes). */
  const fetchGenerationRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured() || !supabase || !user?.id) {
      setData(ZERO_DASHBOARD_DATA);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestGeneration = ++fetchGenerationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error: ordersError } = await supabase
        .from("customer_orders")
        .select(
          "id,customer_id,status,estimated_total,estimated_partial_total,pickup_fee,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label,submitted_at,created_at,updated_at"
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

      // Income from completed orders only. Totals + chart respect the selected calendar
      // period (current week Mon–Sun, current month, or current year).
      const completedOrders = rows.filter((row) => row.status === "completed");
      const completedDropOffOrders = completedOrders.filter(
        (row) => !row.pickup_day_label && !row.pickup_time_slot_label
      );
      const completedDeliveryOrders = completedOrders.filter(
        (row) => Boolean(row.pickup_day_label || row.pickup_time_slot_label)
      );

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

      const now = new Date();
      const chartModel = buildCalendarChartModel(period, now);
      const { periodStart, periodEndExclusive, segmentStarts, labels: chartLabels } = chartModel;

      const inSelectedPeriod = (row: (typeof completedOrders)[number]) => {
        const d = getOrderTimelineDate(row);
        if (!d) return false;
        const t = d.getTime();
        return t >= periodStart.getTime() && t < periodEndExclusive.getTime();
      };

      const completedInPeriod = completedOrders.filter(inSelectedPeriod);
      const completedDropOffInPeriod = completedDropOffOrders.filter(inSelectedPeriod);
      const completedDeliveryInPeriod = completedDeliveryOrders.filter(inSelectedPeriod);

      const totalFrom = (list: typeof rows) =>
        list.reduce((sum, row) => {
          const base =
            row.estimated_total ?? row.estimated_partial_total ?? 0;
          const pickupFee = row.pickup_fee ?? 0;
          return sum + Number(base) + Number(pickupFee);
        }, 0);

      const totalIncome = totalFrom(completedInPeriod);
      const dropOffIncome = totalFrom(completedDropOffInPeriod);
      const deliveryIncome = totalFrom(completedDeliveryInPeriod);

      const customerIds = Array.from(
        new Set(completedInPeriod.map((r) => r.customer_id).filter(Boolean))
      );

      let numberOfUsers = 0;
      if (customerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id")
          .in("id", customerIds);

        if (profilesError) throw new Error(profilesError.message);

        numberOfUsers = profiles?.length ?? 0;
      }

      const earningsChartValues = [0, 0, 0, 0, 0, 0, 0];

      for (const row of completedInPeriod) {
        const timelineDate = getOrderTimelineDate(row);
        if (!timelineDate) continue;
        const bucketIndex = findSegmentBucketIndex(
          segmentStarts,
          timelineDate,
          periodEndExclusive,
        );
        if (bucketIndex < 0 || bucketIndex > 6) continue;
        earningsChartValues[bucketIndex] += getOrderEarningAmount(row);
      }

      const recentCompletedEarnings = completedInPeriod
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
        completedOrdersInPeriod: completedInPeriod.length,
        dropOff: {
          total: dropOffOrders.length,
        },
        delivery: {
          total: deliveryOrders.length,
        },
        totalIncome,
        dropOffIncome,
        deliveryIncome,
        earningsChartValues: toChartValues(earningsChartValues),
        chartLabels,
        recentCompletedEarnings,
      };

      if (requestGeneration === fetchGenerationRef.current) {
        setData(nextData);
      }
    } catch (err) {
      if (requestGeneration !== fetchGenerationRef.current) return;
      const e = err instanceof Error ? err : new Error("Unknown error");
      setError(e);
      setData(ZERO_DASHBOARD_DATA);
    } finally {
      if (requestGeneration === fetchGenerationRef.current) {
        setIsLoading(false);
      }
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
