import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { supabase } from "@/lib/supabase";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;

type EarningItem = {
  id: string;
  orderId: string;
  earnedAmount: number;
  earnedAtIso: string;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(valueIso: string): string {
  const d = new Date(valueIso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function EarningsHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EarningItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user?.id) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("customer_orders")
        .select("id,status,estimated_total,estimated_partial_total,pickup_fee,submitted_at,created_at,updated_at")
        .eq("partner_id", user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (ordersError) throw new Error(ordersError.message);

      const mapped = (orders ?? []).map((row) => {
        const base = row.estimated_total ?? row.estimated_partial_total ?? 0;
        const pickupFee = row.pickup_fee ?? 0;
        const earnedAtIso = String(
          row.submitted_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
        );

        return {
          id: String(row.id ?? ""),
          orderId: String(row.id ?? ""),
          earnedAmount: Number(base) + Number(pickupFee),
          earnedAtIso,
        };
      });

      setItems(mapped);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Could not load earnings.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totalEarnings = useMemo(
    () => items.reduce((sum, item) => sum + item.earnedAmount, 0),
    [items],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.earningsHistoryTitle}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={s.earningsHistoryTitle}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{s.periodEarningsTotal}</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalEarnings)}</Text>
          <Text style={styles.summaryHint}>{s.earningsHistoryHint}</Text>
        </View>

        {isLoading ? (
          <Text style={styles.stateText}>{s.loadingEarnings}</Text>
        ) : error ? (
          <Text style={styles.stateText}>{error}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.stateText}>{s.noRecentEarnings}</Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/(partner)/order-detail",
                  params: { orderId: item.orderId },
                })
              }
              style={({ pressed }) => [styles.rowCard, pressed && styles.rowCardPressed]}
            >
              <View style={styles.rowTop}>
                <Text style={styles.orderIdText}>
                  {s.orderIdLabel}: {item.orderId.slice(0, 8)}
                </Text>
                <Text style={styles.earningText}>{formatMoney(item.earnedAmount)}</Text>
              </View>
              <Text style={styles.metaText}>{formatDateTime(item.earnedAtIso)}</Text>
              <Text style={styles.detailLink}>{s.viewOrderDetails}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: 32,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
  },
  summaryLabel: {
    color: c.blue500,
    fontSize: fs.smallText,
    marginBottom: 4,
  },
  summaryValue: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  summaryHint: {
    marginTop: 6,
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  stateText: {
    color: c.blue500,
    fontSize: fs.smallText,
    textAlign: "center",
    marginTop: 24,
  },
  rowCard: {
    backgroundColor: c.blue900,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 14,
  },
  rowCardPressed: {
    opacity: 0.9,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  orderIdText: {
    flex: 1,
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  earningText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  metaText: {
    marginTop: 4,
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  detailLink: {
    marginTop: 8,
    color: c.white,
    fontSize: fs.xxSmallText,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
