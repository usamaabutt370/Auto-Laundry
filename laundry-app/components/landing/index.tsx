import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";
import { useLandingProviders } from "@/hooks/use-landing-providers";
import { LandingBecomeCaptain } from "./landing-become-captain";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero, type LandingPopularService } from "./landing-hero";
import { LandingPromoBanner } from "./landing-promo-banner";
import { LandingProviders } from "./landing-providers";
import {
  LandingRecentSearches,
  type RecentSearchItem,
} from "./landing-recent-searches";
import { LandingServices } from "./landing-services";
import { LandingTestimonials } from "./landing-testimonials";

function toPickLaundererService(
  service: LandingPopularService | LaundererServiceType | null | undefined,
): LaundererServiceType | undefined {
  if (!service) return undefined;
  if (service === "alterations") return "tailoring";
  return service;
}

const RECENT_KEY = "t2l_landing_recent_searches";

function readRecentSearches(): RecentSearchItem[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearchItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(items: RecentSearchItem[]) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore quota / private mode
  }
}

/** Marketing / marketplace landing for signed-out web visitors. */
export function LandingPage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [activeService, setActiveService] = useState<
    LaundererServiceType | "alterations" | null
  >(null);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);

  const { loading, nearby, recommended } = useLandingProviders({
    query: "",
    service: activeService,
  });

  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  const registerSection = (anchor: string) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[anchor] = e.nativeEvent.layout.y;
  };

  const handleNavigate = useCallback((anchor: string) => {
    const y = sectionOffsets.current[anchor];
    if (y != null) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  }, []);

  const persistSearch = useCallback((title: string) => {
    const item: RecentSearchItem = {
      id: `${Date.now()}`,
      title,
      location: "Lahore",
    };
    setRecent((prev) => {
      const next = [item, ...prev.filter((entry) => entry.title !== title)].slice(0, 8);
      writeRecentSearches(next);
      return next;
    });
  }, []);

  /** Opens the existing provider selection screen (search + book). */
  const openProviderSelection = useCallback(
    (service?: LandingPopularService | LaundererServiceType | null) => {
      const mapped = toPickLaundererService(service);
      if (service === "alterations") persistSearch("Alterations");
      else if (mapped === "washAndFold") persistSearch("Laundry");
      else if (mapped === "press") persistSearch("Ironing");
      else if (mapped === "dryCleaning") persistSearch("Dry Cleaning");
      else if (mapped === "tailoring") persistSearch("Tailoring");

      setActiveService(service === "alterations" ? "alterations" : mapped ?? null);
      router.push({
        pathname: "/(customer)/pick-launderer",
        params: {
          mode: "pickupDelivery",
          ...(mapped ? { service: mapped } : {}),
        },
      });
    },
    [persistSearch, router],
  );

  /** See all → full provider selection (pick launderer) screen. */
  const handleSeeAllProviders = useCallback(() => {
    openProviderSelection(null);
  }, [openProviderSelection]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <LandingHeader onNavigate={handleNavigate} cityLabel="Lahore" />
      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View onLayout={registerSection("home")}>
          <LandingHero onSelectPopular={openProviderSelection} />
        </View>

        <LandingRecentSearches
          items={recent}
          onSelect={(item) => {
            persistSearch(item.title);
            openProviderSelection(null);
          }}
        />

        <View onLayout={registerSection("services")}>
          <LandingServices onExplore={openProviderSelection} />
        </View>

        <LandingPromoBanner onExplore={() => openProviderSelection(null)} />

        <View onLayout={registerSection("providers")}>
          <LandingProviders
            title="Nearby Providers"
            partners={nearby}
            loading={loading}
            onSeeAll={handleSeeAllProviders}
          />
          <LandingProviders
            title="Recommended for You"
            partners={recommended}
            loading={loading}
            onSeeAll={handleSeeAllProviders}
          />
        </View>

        <LandingTestimonials />

        <View onLayout={registerSection("become-captain")}>
          <LandingBecomeCaptain />
        </View>

        <View onLayout={registerSection("help")}>
          <LandingFooter onNavigate={handleNavigate} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  scroll: {
    flex: 1,
  },
});
