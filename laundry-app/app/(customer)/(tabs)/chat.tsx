import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GuestSignInPrompt } from "@/components/guest-sign-in-prompt";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { GradientLoader, APP_LOADER_TINT } from "@/components/ui/gradient-loader";
import { gradients, UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { fetchMyConversations, type ChatConversationListItem } from "@/lib/chat";
import { getStrings } from "@/locales";
import { supabase } from "@/lib/supabase";

const PAD = 16;
const AVATAR = 52;

type ChatFilter = "all" | "active" | "onTheWay" | "completed" | "cancelled";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) =>
      acc.replaceAll(`{{${key}}}`, String(value)).replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function matchesChatFilter(key: string, filter: ChatFilter): boolean {
  if (filter === "all") return true;
  const k = key.toLowerCase();
  if (filter === "onTheWay") return k === "ready";
  if (filter === "completed") return k === "completed";
  if (filter === "cancelled") return k === "cancelled" || k === "rejected";
  // active: still in progress before out for delivery
  return k === "submitted" || k === "draft" || k === "accepted" || k === "in_progress";
}

function statusPresentation(
  key: string,
  s: {
    statusPending: string;
    statusConfirmed: string;
    statusInProgress: string;
    statusOnTheWay: string;
    statusCompleted: string;
    statusCancelled: string;
  },
): { label: string; color: string; bg: string } {
  const k = key.toLowerCase();
  if (k === "cancelled" || k === "rejected") {
    return { label: s.statusCancelled, color: "#B91C1C", bg: "#FEE2E2" };
  }
  if (k === "completed") {
    return { label: s.statusCompleted, color: "#7C3AED", bg: "#F3E8FF" };
  }
  if (k === "ready") {
    return { label: s.statusOnTheWay, color: "#2563EB", bg: "#DBEAFE" };
  }
  if (k === "in_progress") {
    return { label: s.statusInProgress, color: "#0F766E", bg: "#CCFBF1" };
  }
  if (k === "accepted") {
    return { label: s.statusConfirmed, color: "#047857", bg: "#D1FAE5" };
  }
  // submitted / draft / unknown
  return { label: s.statusPending, color: "#B45309", bg: "#FEF3C7" };
}

function formatRelativeTime(
  valueIso: string,
  s: {
    timeJustNow: string;
    timeMinutesAgo: string;
    timeHoursAgo: string;
    timeYesterday: string;
  },
): string {
  const date = new Date(valueIso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60_000));
  if (mins < 1) return s.timeJustNow;
  if (mins < 60) return fill(s.timeMinutesAgo, { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return fill(s.timeHoursAgo, { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return s.timeYesterday;
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
}

function ChatAvatar({ uri, name }: { uri?: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={styles.avatar}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

export default function CustomerChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.chatTab;
  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesChatFilter(item.orderStatusKey, filter)) return false;
      if (!query) return true;
      return (
        item.counterpartyName.toLowerCase().includes(query) ||
        item.orderRef.toLowerCase().includes(query) ||
        item.lastMessageBody.toLowerCase().includes(query)
      );
    });
  }, [filter, items, searchQuery]);

  const emptyCopy =
    searchQuery.trim().length > 0
      ? s.emptySearch
      : filter === "active"
        ? s.emptyActive
        : filter === "onTheWay"
          ? s.emptyOnTheWay
          : filter === "completed"
            ? s.emptyCompleted
            : filter === "cancelled"
              ? s.emptyCancelled
              : s.empty;

  const filters: { id: ChatFilter; label: string }[] = [
    { id: "all", label: s.filterAll },
    { id: "active", label: s.filterActive },
    { id: "onTheWay", label: s.filterOnTheWay },
    { id: "completed", label: s.filterCompleted },
    { id: "cancelled", label: s.filterCancelled },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {!isWeb ? (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.subtitle}>{s.subtitle}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  setSearchOpen((open) => {
                    if (open) setSearchQuery("");
                    return !open;
                  });
                }}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={s.searchA11y}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={UI.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push("/(customer)/(tabs)/order")}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={s.composeA11y}
              >
                <MaterialCommunityIcons name="square-edit-outline" size={18} color={UI.text} />
              </Pressable>
            </View>
          </View>
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
      ) : (
        <>
          {searchOpen ? (
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={UI.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={s.searchPlaceholder}
                placeholderTextColor={UI.muted}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {filters.map((chip) => {
              const selected = filter === chip.id;
              if (selected) {
                return (
                  <Pressable key={chip.id} onPress={() => setFilter(chip.id)}>
                    <LinearGradient
                      colors={[...gradients.cta]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.filterChipActive}
                    >
                      <Text style={styles.filterChipTextActive}>{chip.label}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setFilter(chip.id)}
                  style={styles.filterChip}
                >
                  <Text style={styles.filterChipText}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading && items.length === 0 ? (
            <View style={styles.center}>
              <GradientLoader />
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
          ) : filteredItems.length === 0 ? (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="message-text-outline" size={32} color={UI.teal} />
              </View>
              <Text style={styles.muted}>{emptyCopy}</Text>
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
                  tintColor={APP_LOADER_TINT}
                  colors={[APP_LOADER_TINT]}
                  progressBackgroundColor={UI.card}
                  title=""
                  titleColor={UI.muted}
                />
              }
            >
              {filteredItems.map((item) => {
                const status = statusPresentation(item.orderStatusKey, s);
                return (
                  <Pressable
                    key={item.conversationId}
                    onPress={() =>
                      router.push({
                        pathname: "/(customer)/chat/[orderId]",
                        params: {
                          orderId: item.orderId,
                          memberName: item.counterpartyName,
                        },
                      })
                    }
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <ChatAvatar
                      uri={item.counterpartyAvatarUrl}
                      name={item.counterpartyName}
                    />
                    <View style={styles.mainContent}>
                      <View style={styles.rowTop}>
                        <PartnerNameWithBadge
                          name={item.counterpartyName}
                          verified={item.counterpartyVerified}
                          numberOfLines={1}
                          badgeSize={14}
                          badgeColor="#22C55E"
                          nameStyle={styles.nameText}
                          containerStyle={styles.nameRow}
                        />
                        <Text style={styles.timeText}>
                          {formatRelativeTime(item.lastMessageAt, s)}
                        </Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.orderRef} numberOfLines={1}>
                          {fill(s.orderRef, { ref: item.orderRef })}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.previewRow}>
                        <Text
                          style={[
                            styles.previewText,
                            item.unreadCount > 0 && styles.previewUnread,
                          ]}
                          numberOfLines={2}
                        >
                          {item.lastMessageBody}
                        </Text>
                        {item.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: UI.text,
    fontFamily: "Poppins-Bold",
  },
  subtitle: {
    fontSize: 13,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: PAD,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: UI.text,
    fontFamily: "Poppins-Regular",
    padding: 0,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: PAD,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterChipText: {
    fontSize: 13,
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  filterChipTextActive: {
    fontSize: 13,
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
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
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: PAD,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: UI.iconWell,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  avatarInitial: {
    fontSize: 18,
    color: UI.purple,
    fontFamily: "Poppins-Bold",
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameRow: {
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    color: UI.text,
    fontSize: 15,
    fontFamily: "Poppins-Bold",
  },
  timeText: {
    color: UI.muted,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderRef: {
    flex: 1,
    minWidth: 0,
    color: UI.muted,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 2,
  },
  previewText: {
    flex: 1,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Regular",
  },
  previewUnread: {
    color: UI.text,
    fontFamily: "Poppins-Medium",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.88,
  },
});
