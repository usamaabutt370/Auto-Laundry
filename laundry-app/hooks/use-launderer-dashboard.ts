import { useMemo } from "react";

import type { LaundererDashboardData } from "@/types/dashboard";
import { ZERO_DASHBOARD_DATA } from "@/types/dashboard";

export interface UseLaundererDashboardResult {
  data: LaundererDashboardData;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Provides dashboard data for the Launderer dashboard screen.
 *
 * To use real data: replace the implementation below with a Supabase (or API) call,
 * then map the response to LaundererDashboardData. The UI already consumes this shape –
 * no component changes needed.
 *
 * Example with Supabase:
 *   const { data: row } = await supabase.from('launderer_stats').select('*').eq('user_id', userId).single();
 *   return { data: mapRowToDashboardData(row), isLoading: false, error: null };
 */
export function useLaundererDashboard(): UseLaundererDashboardResult {
  // TODO: Replace with real fetch. Example:
  // const [data, setData] = useState<LaundererDashboardData>(ZERO_DASHBOARD_DATA);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<Error | null>(null);
  // useEffect(() => { fetchDashboard().then(setData).catch(setError).finally(() => setIsLoading(false)); }, []);
  // return { data, isLoading, error };

  const data = useMemo<LaundererDashboardData>(() => ZERO_DASHBOARD_DATA, []);
  return {
    data,
    isLoading: false,
    error: null,
  };
}
