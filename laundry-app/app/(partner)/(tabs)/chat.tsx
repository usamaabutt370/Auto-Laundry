import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { fetchMyConversations, type ChatConversationListItem } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

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

export default function PartnerChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).tabs.partner;
  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
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
      setError(e instanceof Error ? e.message : "Unable to load chats.");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase
      .channel(`partner-chat-list-${user.id}-${Date.now()}`)
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
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppHeader title={s.chat} />
      </SafeAreaView>
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
        {error ? (
          <Text style={styles.placeholderText}>{error}</Text>
        ) : !loading && hasLoaded && items.length === 0 ? (
          <Text style={styles.placeholderText}>No chats yet.</Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.conversationId}
              onPress={() =>
                router.push({
                  pathname: "/(partner)/chat/[orderId]",
                  params: { orderId: item.orderId, memberName: item.counterpartyName },
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowTop}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {item.counterpartyName}
                </Text>
                <Text style={styles.timeText}>{formatShortDate(item.lastMessageAt)}</Text>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                Order #{item.orderRef} · {item.orderStatus}
              </Text>
              <View style={styles.orderMetaRow}>
                <Text style={styles.orderMetaText} numberOfLines={1}>
                  {item.servicesSummary}
                </Text>
                <Text style={styles.orderMetaText}>Placed {item.placedAtLabel}</Text>
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
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 10,
  },
  placeholderText: {
    fontSize: fs.descText,
    color: c.white,
    textAlign: "center",
    marginTop: 24,
  },
  row: {
    backgroundColor: c.blue900,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 12,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    flex: 1,
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
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: 8,
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
