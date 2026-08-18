import { MaterialCommunityIcons } from "@expo/vector-icons";
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

const c = theme.colors;
const fs = theme.fontSize;
const PAD = 24;

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
      {!isWeb ? (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppHeader title={tabStrings.chat} />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}
      {!user?.id ? (
        <GuestSignInPrompt
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
          <ActivityIndicator color={c.white} />
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
          <MaterialCommunityIcons name="message-text-outline" size={48} color={c.blue500} />
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
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
              progressBackgroundColor={c.background}
              title=""
              titleColor="#FFFFFF"
            />
          }
        >
          {items.map((item) => (
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

                <Text style={styles.metaText} numberOfLines={1}>
                  Order #{item.orderRef} · {item.orderStatus}
                </Text>

                <View style={styles.orderMetaRow}>
                  <Text style={styles.orderMetaText} numberOfLines={1}>
                    {item.servicesSummary}
                  </Text>
                  <Text style={styles.orderMetaValue}>{item.estimatedTotalLabel}</Text>
                </View>

                <View style={styles.rowBottom}>
                  <Text style={styles.previewText} numberOfLines={1}>
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
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingHorizontal: PAD,
    paddingBottom: 12,
  },
  center: {
    flex: 1,
    paddingHorizontal: PAD,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  muted: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
  },
  errorText: {
    fontSize: fs.smallText,
    color: "#fecaca",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.outline,
  },
  retryLabel: {
    color: c.white,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PAD,
    paddingBottom: 100,
    gap: 10,
  },
  row: {
    backgroundColor: c.blue900,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  mainContent: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flex: 1,
    flexShrink: 1,
  },
  nameText: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  timeText: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  metaText: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  orderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderMetaText: {
    flex: 1,
    color: c.blue500,
    fontSize: fs.xxSmallText,
  },
  orderMetaValue: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  previewText: {
    flex: 1,
    color: c.white,
    fontSize: fs.descText,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: c.background,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
