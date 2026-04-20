import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OrderCard } from "@/components/order-card";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { fetchPartnerOrders, type PartnerOrderListItem } from "@/lib/partner-orders";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;

type DashboardOrderKind = "dropoff" | "delivery";

export default function DashboardOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;

  const kind: DashboardOrderKind =
    params.kind === "delivery" ? "delivery" : "dropoff";

  const [orders, setOrders] = useState<PartnerOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const allOrders = await fetchPartnerOrders();
        if (cancelled) return;
        const filtered = allOrders.filter(
          (order) =>
            order.orderType === kind &&
            order.rawStatus !== "completed" &&
            order.rawStatus !== "rejected" &&
            order.rawStatus !== "cancelled",
        );
        setOrders(filtered);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const title = kind === "delivery" ? "Delivery orders" : "Drop Off orders";

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={title}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.caption}>
          Showing {orders.length} {kind === "delivery" ? "delivery" : "drop off"}{" "}
          orders.
        </Text>

        {isLoading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Loading orders…</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                customerName={order.customerName}
                initial={order.initial}
                subtitle={order.subtitle}
                rightIcon={order.rightIcon}
                statusLabel={order.status}
              />
            ))}
          </View>
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
    paddingBottom: 24,
  },
  caption: {
    fontSize: fs.smallText,
    color: c.blue500,
    marginBottom: 12,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
  },
  list: {
    gap: 10,
  },
});

