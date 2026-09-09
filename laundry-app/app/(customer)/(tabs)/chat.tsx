import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { AvatarImage } from "@/components/avatar-image";
import { GuestSignInPrompt } from "@/components/guest-sign-in-prompt";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { fetchMyConversations, type ChatConversationListItem } from "@/lib/chat";
import { getStrings } from "@/locales";
import { supabase } from "@/lib/supabase";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  openBg: "#ECFDF5",
  openText: "#047857",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  red: "#B91C1C",
  redBg: "#FEE2E2",
  shadow: "rgba(17, 24, 39, 0.08)",
};
const fs = theme.fontSize;
const PAD = 16;

function formatShortDate(valueIso: string): string {
  const d = new Date(valueIso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function statusTone(status: string): { text: string; bg: string } {
  const key = status.toLowerCase();
  if (key.includes("reject") || key.includes("cancel")) {
    return { text: UI.red, bg: UI.redBg };
  }
  if (
    key.includes("accept") ||
    key.includes("complete") ||
    key.includes("deliver")
  ) {
    return { text: UI.openText, bg: UI.openBg };
  }
  if (key.includes("submit") || key.includes("pending")) {
    return { text: UI.amber, bg: UI.amberBg };
  }
  return { text: UI.muted, bg: "#F3F4F6" };
}

export default function CustomerChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();
  const { locale } = useLocale();
  const tabStrings = getStrings(locale).tabs.customer;
  const s = getStrings(locale).customer.chatTab;
  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyConversations(user.id);
      setItems(data);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : s.error);
    } finally {
      setLoading(false);
    }
  }, [s.error, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase
      .channel(`customer-chat-list-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          void (async () => {
            try {
              const data = await fetchMyConversations(user.id);
              setItems(data);
              setError(null);
            } catch {
              // keep existing list state on realtime refresh failure
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    void (async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
    })();
  }, [load]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {!isWeb ? (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppHeader appearance="light" title={tabStrings.chat} />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}
      {!user?.id ? (
        <GuestSignInPrompt
          appearance="light"
          variant="chat"
          title={s.signInTitle}
          subtitle={s.signInSubtitle}
          buttonLabel={s.logIn}
          onPressLogin={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { returnTo: "chat" },
            })
          }
        />
      ) : loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={UI.teal} />
          <Text style={styles.muted}>{s.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>{s.retry}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="message-text-outline" size={32} color={UI.teal} />
          </View>
          <Text style={styles.muted}>{s.empty}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI.teal}
              colors={[UI.teal]}
              progressBackgroundColor={UI.card}
              title=""
              titleColor={UI.muted}
            />
          }
        >
          {items.map((item) => {
            const tone = statusTone(item.orderStatus);
            return (
              <Pressable
                key={item.conversationId}
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/chat/[orderId]",
                    params: { orderId: item.orderId, memberName: item.counterpartyName },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <AvatarImage
                  uri={item.counterpartyAvatarUrl}
                  name={item.counterpartyName}
                  size={48}
                />
                <View style={styles.mainContent}>
                  <View style={styles.rowTop}>
                    <PartnerNameWithBadge
                      name={item.counterpartyName}
                      verified={item.counterpartyVerified}
                      nameStyle={styles.nameText}
                      containerStyle={styles.nameRow}
                    />
                    <Text style={styles.timeText}>{formatShortDate(item.lastMessageAt)}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      Order #{item.orderRef}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusText, { color: tone.text }]}>
                        {item.orderStatus}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderMetaRow}>
                    <Text style={styles.orderMetaText} numberOfLines={1}>
                      {item.servicesSummary}
                    </Text>
                    <Text style={styles.orderMetaValue}>{item.estimatedTotalLabel}</Text>
                  </View>

                  <View style={styles.rowBottom}>
                    <Text
                      style={[
                        styles.previewText,
                        item.unreadCount > 0 && styles.previewUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessageBody}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  safeArea: {
    backgroundColor: UI.bg,
    paddingBottom: 4,
  },
  center: {
    flex: 1,
    paddingHorizontal: PAD,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.openBg,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    fontSize: fs.smallText,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  errorText: {
    fontSize: fs.smallText,
    fontFamily: "Poppins-Regular",
    color: UI.red,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
  },
  retryLabel: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 100,
    gap: 12,
  },
  row: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  mainContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    flex: 1,
    flexShrink: 1,
  },
  nameText: {
    color: UI.text,
    fontSize: fs.smallText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  timeText: {
    color: UI.muted,
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flexShrink: 1,
    color: UI.muted,
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Regular",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  orderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderMetaText: {
    flex: 1,
    color: UI.muted,
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Regular",
  },
  orderMetaValue: {
    color: UI.teal,
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  previewText: {
    flex: 1,
    color: UI.muted,
    fontSize: fs.descText,
    fontFamily: "Poppins-Regular",
  },
  previewUnread: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
