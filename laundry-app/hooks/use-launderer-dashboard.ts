import { useCallback, useEffect, useState } from "react";

import type { DashboardPeriod } from "@/components/dashboard-period-selector";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { LaundererDashboardData } from "@/types/dashboard";
import { ZERO_DASHBOARD_DATA } from "@/types/dashboard";

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
  /** When false (e.g. before onboarding), return zero data and skip fetching. */
  enabled: boolean,
  /** Week / Month / Year – for future use when backend supports period filter. */
  _period: DashboardPeriod = "week"
): UseLaundererDashboardResult {
  const { user } = useAuth();
  const [data, setData] = useState<LaundererDashboardData>(ZERO_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured() || !supabase || !user?.id) {
      setData(ZERO_DASHBOARD_DATA);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data: row, error: fetchError } = await supabase
      .from("partner_dashboard_stats")
      .select(
        "number_of_users,drop_off_total,drop_off_wash_and_fold,drop_off_dry_cleaning,drop_off_tailoring,delivery_total,delivery_wash_and_fold,delivery_dry_cleaning,delivery_tailoring,total_income,drop_off_income,delivery_income,balance,chart_values"
      )
      .eq("user_id", user.id)
      .maybeSingle<{
        number_of_users: number;
        drop_off_total: number;
        drop_off_wash_and_fold: number;
        drop_off_dry_cleaning: number;
        drop_off_tailoring: number;
        delivery_total: number;
        delivery_wash_and_fold: number;
        delivery_dry_cleaning: number;
        delivery_tailoring: number;
        total_income: number;
        drop_off_income: number;
        delivery_income: number;
        balance: number;
        chart_values: number[] | null;
      }>();

    if (fetchError) {
      setError(new Error(fetchError.message));
      setData(ZERO_DASHBOARD_DATA);
      setIsLoading(false);
      return;
    }

    if (!row) {
      setData(ZERO_DASHBOARD_DATA);
      setError(null);
      setIsLoading(false);
      return;
    }

    const chartValues = (row.chart_values ?? []).slice(0, 7);
    while (chartValues.length < 7) chartValues.push(0);

    setData({
      numberOfUsers: row.number_of_users ?? 0,
      dropOff: {
        total: row.drop_off_total ?? 0,
        washAndFold: row.drop_off_wash_and_fold ?? 0,
        dryCleaning: row.drop_off_dry_cleaning ?? 0,
        tailoring: row.drop_off_tailoring ?? 0,
      },
      delivery: {
        total: row.delivery_total ?? 0,
        washAndFold: row.delivery_wash_and_fold ?? 0,
        dryCleaning: row.delivery_dry_cleaning ?? 0,
        tailoring: row.delivery_tailoring ?? 0,
      },
      totalIncome: Number(row.total_income ?? 0),
      dropOffIncome: Number(row.drop_off_income ?? 0),
      deliveryIncome: Number(row.delivery_income ?? 0),
      balance: Number(row.balance ?? 0),
      chartValues: [
        chartValues[0] ?? 0,
        chartValues[1] ?? 0,
        chartValues[2] ?? 0,
        chartValues[3] ?? 0,
        chartValues[4] ?? 0,
        chartValues[5] ?? 0,
        chartValues[6] ?? 0,
      ],
    });
    setError(null);
    setIsLoading(false);
  }, [enabled, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
