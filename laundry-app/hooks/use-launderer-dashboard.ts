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
          "id,status,estimated_total,estimated_partial_total,pickup_fee,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label,submitted_at"
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

      const today = new Date();
      const chartStart = new Date();
      chartStart.setDate(today.getDate() - 6);
      chartStart.setHours(0, 0, 0, 0);

      const chartValues: [number, number, number, number, number, number, number] =
        [0, 0, 0, 0, 0, 0, 0];

      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("partner_credit_ledger")
        .select("delta,created_at,event_type,metadata")
        .eq("partner_id", user.id)
        .eq("event_type", "order_charge")
        .gte("created_at", chartStart.toISOString())
        .order("created_at", { ascending: false });

      if (ledgerError) throw new Error(ledgerError.message);

      const orderStatusById = new Map<string, string>();
      for (const row of rows) {
        if (row.id) orderStatusById.set(String(row.id), String(row.status ?? ""));
      }

      const completedLedgerRows = (ledgerRows ?? []).filter((row) => {
        const metadata = (row.metadata ?? {}) as { order_id?: string };
        const orderId = metadata.order_id ? String(metadata.order_id) : "";
        return orderStatusById.get(orderId) === "completed";
      });

      for (const row of completedLedgerRows) {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        if (!createdAt) continue;
        const diffDays = Math.floor(
          (createdAt.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 0 && diffDays < 7) {
          chartValues[diffDays] += Math.abs(Number(row.delta ?? 0));
        }
      }

      const latestOrderDeduction =
        Math.abs(Number(completedLedgerRows?.[0]?.delta ?? 0)) || 0;

      const recentCompletedOrderDeductions = completedLedgerRows
        .slice(0, 2)
        .map((row) => {
          const metadata = (row.metadata ?? {}) as {
            order_id?: string;
            order_amount?: number;
          };
          return {
            orderId: metadata.order_id ? String(metadata.order_id) : "unknown",
            deductedTokens: Math.abs(Number(row.delta ?? 0)),
            orderAmount: Number(metadata.order_amount ?? 0),
            chargedAtIso: String(row.created_at ?? new Date().toISOString()),
          };
        });

      const completedOrderDeductionsTotal = completedLedgerRows.reduce(
        (sum, row) => sum + Math.abs(Number(row.delta ?? 0)),
        0,
      );

      const { data: creditAccount, error: creditError } = await supabase
        .from("partner_credit_accounts")
        .select("balance")
        .eq("partner_id", user.id)
        .maybeSingle<{ balance: number }>();

      if (creditError) throw new Error(creditError.message);

      const balance = creditAccount?.balance ?? 0;

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
        balance,
        latestOrderDeduction,
        completedOrderDeductionsTotal,
        recentCompletedOrderDeductions,
        chartValues,
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
