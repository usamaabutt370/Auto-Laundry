import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import type { LandingProvider } from "@/hooks/use-landing-providers";
import { LandingContainer } from "./landing-container";
import { LandingProviderCard } from "./landing-provider-card";

const PREVIEW_COUNT = 4;

type Props = {
  title: string;
  partners: LandingProvider[];
  loading?: boolean;
  emptyLabel?: string;
  /** Web: See all goes to login / provider selection instead of expanding. */
  onSeeAll?: () => void;
};

/** Grid of nearby / recommended providers from Supabase. */
export function LandingProviders({
  title,
  partners,
  loading,
  emptyLabel = "No providers found nearby yet.",
  onSeeAll,
}: Props) {
  const router = useRouter();
  const { isWeb, isWebDesktop, width } = useResponsiveLayout();
  const columns = isWebDesktop ? 4 : width >= 700 ? 2 : 1;
  const [expanded, setExpanded] = useState(false);

  const hasMore = partners.length > PREVIEW_COUNT;
  const visible = expanded && !onSeeAll ? partners : partners.slice(0, PREVIEW_COUNT);
  const showSeeAll = Boolean(onSeeAll) || hasMore;

  return (
    <View style={styles.section}>
      <LandingContainer>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {showSeeAll ? (
            <Pressable
              onPress={() => {
                if (isWeb && onSeeAll) {
                  onSeeAll();
                  return;
                }
                setExpanded((prev) => !prev);
              }}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="button"
              accessibilityLabel="See all providers"
            >
              <Text style={styles.seeAll}>{expanded && !onSeeAll ? "Show less" : "See all"}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={UI.blue} />
          </View>
        ) : partners.length === 0 ? (
          <Text style={styles.empty}>{emptyLabel}</Text>
        ) : (
          <View style={styles.grid}>
            {visible.map((partner) => (
              <View
                key={partner.id}
                style={[
                  styles.cell,
                  { width: columns === 1 ? "100%" : `${100 / columns - 1.5}%` },
                ]}
              >
                <LandingProviderCard
                  partner={partner}
                  onViewProfile={() =>
                    router.push({
                      pathname: "/(customer)/launderer-detail",
                      params: {
                        id: partner.id,
                        name: partner.business_name?.trim() || "",
                        mode: partner.fulfillmentMode ?? "pickupDelivery",
                      },
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    backgroundColor: UI.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.blue,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  empty: {
    color: UI.muted,
    fontSize: 15,
    paddingVertical: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 16,
  },
  cell: {
    minWidth: 220,
    display: "flex",
  },
  pressed: {
    opacity: 0.8,
  },
});
