import { useEffect, useState } from "react";

import { isPartnerVerified } from "@/lib/partner-verification";

export function usePartnerVerified(partnerId: string | null | undefined): boolean {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!partnerId) {
      setVerified(false);
      return;
    }

    void isPartnerVerified(partnerId).then((value) => {
      if (!cancelled) setVerified(value);
    });

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  return verified;
}
