import { useCallback, useEffect, useMemo, useState } from "react";

import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { buildCustomerOrderEstimate } from "@/lib/customer-order-estimate";
import { fetchPartnerDetail } from "@/lib/partner-discovery";
import { formatMoney } from "@/utils/format-money";

export function usePartnerOrderEstimate(
  partnerId: string | null,
  draft: CustomerOrderDraft,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["profile"]
  >(null);
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      setProfile(null);
      setServices([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { profile: p, services: rows, error: err } =
      await fetchPartnerDetail(partnerId);
    if (err) setError(err);
    setProfile(p);
    setServices(rows);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const estimate = useMemo(
    () => buildCustomerOrderEstimate(draft, profile, services),
    [draft, profile, services],
  );

  const totalDisplay = useMemo(() => {
    if (estimate.total != null) {
      return formatMoney(estimate.currencyPrefix, estimate.total);
    }
    if (estimate.partialTotal > 0) {
      return `${formatMoney(estimate.currencyPrefix, estimate.partialTotal)} *`;
    }
    return null;
  }, [estimate]);

  return {
    loading,
    error,
    profile,
    services,
    estimate,
    totalDisplay,
    reload: load,
  };
}
