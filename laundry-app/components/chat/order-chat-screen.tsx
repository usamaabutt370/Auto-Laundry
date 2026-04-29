import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  ensureOrderConversation,
  deleteConversationMessage,
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
  type ChatMessage,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";

const c = theme.colors;
const fs = theme.fontSize;
const PAD = 20;

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OrderChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { user, role } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const canLoad = Boolean(orderId && user?.id);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages],
  );

  const refresh = useCallback(async () => {
    if (!canLoad || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const convId = await ensureOrderConversation(orderId, user.id, role);
      setConversationId(convId);
      const rows = await fetchConversationMessages(convId);
      setMessages(rows);
      await markConversationRead(convId, user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load chat.");
    } finally {
      setLoading(false);
    }
  }, [canLoad, orderId, role, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!conversationId || !user?.id || !supabase) return;

    const channel = supabase
      .channel(`order-chat-${conversationId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string;
              body: string;
              created_at: string;
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  id: row.id,
                  conversationId: row.conversation_id,
                  senderId: row.sender_id,
                  body: row.body,
                  createdAt: row.created_at,
                },
              ];
            });

            if (row.sender_id !== user.id) {
              void markConversationRead(conversationId, user.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            const deletedId = oldRow?.id;
            if (!deletedId) return;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (orderedMessages.length === 0) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [orderedMessages.length]);

  const onSend = async () => {
    if (!conversationId || !user?.id || sending) return;
    const next = draft.trim();
    if (!next) return;

    setSending(true);
    try {
      setDraft("");
      const sent = await sendConversationMessage(conversationId, user.id, next);
      setMessages((prev) => [...prev, sent]);
      await markConversationRead(conversationId, user.id);
    } catch (e) {
      setDraft(next);
      setError(e instanceof Error ? e.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onDeleteMessage = (messageId: string) => {
    if (!user?.id) return;

    Alert.alert("Delete message", "Are you sure you want to delete this message?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteConversationMessage(messageId, user.id);
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Failed to delete message.",
              );
            }
          })();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
    >
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Order chat</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.white} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void refresh()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <FlatList
            ref={listRef}
            data={orderedMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.id;
              return (
                <View
                  style={[
                    styles.bubbleWrap,
                    mine ? styles.bubbleWrapMine : styles.bubbleWrapOther,
                  ]}
                >
                  <Pressable
                    onLongPress={() => {
                      if (mine) onDeleteMessage(item.id);
                    }}
                    delayLongPress={280}
                  >
                    <View
                      style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                    >
                      <Text style={styles.bubbleText}>{item.body}</Text>
                      <Text style={styles.bubbleTime}>{formatClock(item.createdAt)}</Text>
                    </View>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
              </View>
            }
          />

          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => {
                void onSend();
              }}
              placeholder="Type a message..."
              placeholderTextColor={c.blue500}
              style={styles.input}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              maxLength={1000}
            />
            <Pressable
              onPress={onSend}
              disabled={sending || !draft.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                (sending || !draft.trim()) && styles.sendBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons name="send" size={20} color={c.white} />
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeTop: {
    paddingHorizontal: PAD,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: c.white,
    fontSize: fs.titleMedium,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingVertical: 10,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: "row",
  },
  bubbleWrapMine: {
    justifyContent: "flex-end",
  },
  bubbleWrapOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: c.lightBlue,
  },
  bubbleOther: {
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.outline,
  },
  bubbleText: {
    color: c.white,
    fontSize: fs.smallText,
    lineHeight: 20,
  },
  bubbleTime: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    marginTop: 6,
    alignSelf: "flex-end",
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: PAD,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: c.background,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    color: c.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fs.smallText,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.lightBlue,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAD,
    gap: 10,
  },
  errorText: {
    color: "#fecaca",
    textAlign: "center",
    fontSize: fs.smallText,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 30,
  },
  emptyText: {
    color: c.blue500,
    fontSize: fs.smallText,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
