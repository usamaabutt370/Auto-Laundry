import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Legacy route: Wash & Fold pricing now uses the itemized flow (service-other).
 */
export default function PartnerOnboardingStep3() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();

  useEffect(() => {
    const service =
      typeof params.service === "string" && params.service.trim()
        ? params.service
        : "washAndFold";
    router.replace({
      pathname: "/(partner)/onboarding/service-other",
      params: { service },
    });
  }, [params.service, router]);

  return null;
}
