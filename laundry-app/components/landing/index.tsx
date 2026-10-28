import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLandingProviders } from "@/hooks/use-landing-providers";
import { LandingBecomeCaptain } from "./landing-become-captain";
import { LandingContainer } from "./landing-container";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero, type LandingPopularService } from "./landing-hero";
import { LandingPromoBanner } from "./landing-promo-banner";
import { LandingProviders } from "./landing-providers";
import {
  LandingRecentSearches,
  type RecentSearchItem,
} from "./landing-recent-searches";
import {
  LANDING_SEARCH_BAR_SLOT_HEIGHT,
  LandingSearchBar,
} from "./landing-search-bar";
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
const BLUR_UNDOCK_MS = 180;

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
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ignore blur from unmounting the hero input while relocating it. */
  const suppressBlurRef = useRef(false);
  const [query, setQuery] = useState("");
  const [activeService, setActiveService] = useState<
    LaundererServiceType | "alterations" | null
  >(null);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [searchDocked, setSearchDocked] = useState(false);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);

  const { loading, nearby, recommended, filtered } = useLandingProviders({
    query: appliedQuery,
    service: activeService,
  });

  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
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

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Live-filter Nearby Providers as the user types.
    setAppliedQuery(value);
    // Empty search returns the bar to the hero.
    if (!value.trim()) {
      setSearchDocked(false);
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    suppressBlurRef.current = true;
    setSearchDocked(true);
    // Scroll after layout places the bar above providers.
    requestAnimationFrame(() => {
      const y = sectionOffsets.current.providers;
      if (y != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
      // Docked input autoFocus will fire; allow real outside-clicks after settle.
      setTimeout(() => {
        suppressBlurRef.current = false;
        searchInputRef.current?.focus();
      }, 80);
    });
  }, []);

  const handleSearchBlur = useCallback(() => {
    if (suppressBlurRef.current) return;
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    // Undock only after a real outside click / focus loss — not while relocating.
    blurTimerRef.current = setTimeout(() => {
      setSearchDocked(false);
      blurTimerRef.current = null;
    }, BLUR_UNDOCK_MS);
  }, []);

  const runSearch = useCallback(() => {
    const nextQuery = query.trim();
    setAppliedQuery(nextQuery);
    if (!nextQuery) {
      setSearchDocked(false);
      return;
    }
    persistSearch(nextQuery);
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    // Keep docked until navigation; do not undock on Search press alone.
    suppressBlurRef.current = true;
    router.push({
      pathname: "/(customer)/pick-launderer",
      params: {
        mode: "pickupDelivery",
        q: nextQuery,
      },
    });
  }, [query, persistSearch, router]);

  /** Web See all: login first, then provider selection. */
  const handleSeeAllProviders = useCallback(() => {
    if (isAuthenticated) {
      router.push({
        pathname: "/(customer)/pick-launderer",
        params: { mode: "pickupDelivery" },
      });
      return;
    }
    router.push({
      pathname: "/(auth)/login",
      params: { returnTo: "pick-launderer" },
    });
  }, [isAuthenticated, router]);

  const searchBar = (
    <LandingSearchBar
      ref={searchInputRef}
      query={query}
      onQueryChange={handleQueryChange}
      cityLabel="Lahore"
      onSearch={runSearch}
      onFocus={handleSearchFocus}
      onBlur={handleSearchBlur}
      autoFocus={searchDocked}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <LandingHeader onNavigate={handleNavigate} cityLabel="Lahore" />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View onLayout={registerSection("home")}>
          <LandingHero
            searchBar={
              searchDocked ? (
                <View
                  style={styles.searchSpacer}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : (
                searchBar
              )
            }
            onSelectPopular={openProviderSelection}
          />
        </View>

        <LandingRecentSearches
          items={recent}
          onSelect={(item) => {
            setQuery(item.title);
            setAppliedQuery(item.title);
            openProviderSelection(null);
          }}
        />

        <View onLayout={registerSection("services")}>
          <LandingServices onExplore={openProviderSelection} />
        </View>

        <LandingPromoBanner onExplore={() => openProviderSelection(null)} />

        <View onLayout={registerSection("providers")}>
          {searchDocked ? (
            <LandingContainer style={styles.dockedSearchWrap}>{searchBar}</LandingContainer>
          ) : null}
          <LandingProviders
            title="Nearby Providers"
            partners={nearby}
            loading={loading}
            onSeeAll={handleSeeAllProviders}
            emptyLabel={
              filtered.length === 0 && !loading
                ? "No providers match your search. Try another name."
                : undefined
            }
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
  searchSpacer: {
    height: LANDING_SEARCH_BAR_SLOT_HEIGHT,
    width: "100%",
  },
  dockedSearchWrap: {
    paddingTop: 8,
    paddingBottom: 4,
  },
});
