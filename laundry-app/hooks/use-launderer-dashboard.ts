import { useCallback } from "react";

import type { LaundererDashboardData } from "@/types/dashboard";
import { DEMO_DASHBOARD_DATA } from "@/types/dashboard";
import type { DashboardPeriod } from "@/components/dashboard-period-selector";

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
  /** When false (e.g. before onboarding), could return zero data. */
  _enabled: boolean,
  /** Week / Month / Year – for future use when backend supports period filter. */
  _period: DashboardPeriod = "week"
): UseLaundererDashboardResult {
  const refresh = useCallback(async () => {
    // No-op for now; when backend is ready, call your API here.
  }, []);

  return {
    data: DEMO_DASHBOARD_DATA,
    isLoading: false,
    error: null,
    refresh,
  };
}
