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

type DeductionItem = {
  id: string;
  orderId: string;
  deductedTokens: number;
  orderAmount: number;
  chargedAtIso: string;
  balanceAfter: number;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

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

export default function TokenDeductionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<DeductionItem[]>([]);
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
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("partner_credit_ledger")
        .select("id,delta,balance_after,created_at,event_type,metadata")
        .eq("partner_id", user.id)
        .eq("event_type", "order_charge")
        .order("created_at", { ascending: false });

      if (ledgerError) throw new Error(ledgerError.message);

      const rawRows = ledgerRows ?? [];
      const orderIds = rawRows
        .map((row) => {
          const metadata = (row.metadata ?? {}) as { order_id?: string };
          return metadata.order_id ? String(metadata.order_id) : "";
        })
        .filter(Boolean);

      const uniqueOrderIds = Array.from(new Set(orderIds));
      const completedOrderSet = new Set<string>();
      if (uniqueOrderIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from("customer_orders")
          .select("id,status")
          .in("id", uniqueOrderIds);
        if (ordersError) throw new Error(ordersError.message);
        for (const row of orders ?? []) {
          if (row.status === "completed" && row.id) {
            completedOrderSet.add(String(row.id));
          }
        }
      }

      const mapped = rawRows
        .map((row) => {
          const metadata = (row.metadata ?? {}) as {
            order_id?: string;
            order_amount?: number;
          };
          const orderId = metadata.order_id ? String(metadata.order_id) : "";
          return {
            id: String(row.id),
            orderId,
            deductedTokens: Math.abs(Number(row.delta ?? 0)),
            orderAmount: Number(metadata.order_amount ?? 0),
            chargedAtIso: String(row.created_at ?? ""),
            balanceAfter: Number(row.balance_after ?? 0),
            isCompletedOrder: completedOrderSet.has(orderId),
          };
        })
        .filter((row) => row.isCompletedOrder)
        .map(({ isCompletedOrder: _ignore, ...row }) => row);

      setItems(mapped);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Could not load deductions.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totalDeducted = useMemo(
    () => items.reduce((sum, item) => sum + item.deductedTokens, 0),
    [items],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.deductionHistoryTitle}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={s.deductionHistoryTitle}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{s.completedOrdersDeductionTotal}</Text>
          <Text style={styles.summaryValue}>
            {formatCount(totalDeducted)} {s.tokensUnit}
          </Text>
          <Text style={styles.summaryHint}>{s.deductionHistoryHint}</Text>
        </View>

        {isLoading ? (
          <Text style={styles.stateText}>{s.loadingDeductions}</Text>
        ) : error ? (
          <Text style={styles.stateText}>{error}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.stateText}>{s.noCompletedDeductions}</Text>
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
                <Text style={styles.tokensText}>
                  -{formatCount(item.deductedTokens)} {s.tokensUnit}
                </Text>
              </View>
              <Text style={styles.metaText}>
                {formatDateTime(item.chargedAtIso)} • {s.orderAmountLabel}:{" "}
                {formatMoney(item.orderAmount)}
              </Text>
              <Text style={styles.metaText}>
                {s.remainingTokens}: {formatCount(item.balanceAfter)} {s.tokensUnit}
              </Text>
              <Text style={styles.orderDetailLink}>{s.viewOrderDetails}</Text>
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
  tokensText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  metaText: {
    marginTop: 4,
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  orderDetailLink: {
    marginTop: 8,
    color: c.white,
    fontSize: fs.xxSmallText,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
