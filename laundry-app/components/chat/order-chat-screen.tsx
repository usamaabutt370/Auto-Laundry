import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Modal,
  Platform,
  type ScrollViewProps,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardChatScrollView,
  KeyboardGestureArea,
  KeyboardStickyView,
  useKeyboardHandler,
} from "react-native-keyboard-controller";
import { runOnJS } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { ChatListScrollView } from "@/components/chat/chat-list-scroll-view";
import { RiderAssignmentMessage } from "@/components/chat/rider-assignment-message";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  ensureOrderConversation,
  fetchOrderChatHeader,
  deleteConversationMessages,
  fetchConversationMessages,
  markConversationRead,
  normalizeChatMessageRow,
  sendConversationMessage,
  uploadChatImage,
  type ChatMessage,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";

const c = theme.colors;
const fs = theme.fontSize;
const CHAT_INPUT_NATIVE_ID = "order-chat-input";
const PAD = 20;

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const CHAT_IMAGE_BOX_SIZE = 200;

type PendingUploadMessage = {
  tempId: string;
  localUri: string;
  createdAt: string;
  body: string;
  progress: number;
  statusText: string;
};

type DisplayChatItem =
  | { kind: "sent"; item: ChatMessage }
  | { kind: "uploading"; item: PendingUploadMessage };

function ChatMessageImage({
  uri,
  selectionMode,
  alignEnd,
  onOpen,
  onLongPress,
}: {
  uri: string;
  selectionMode: boolean;
  alignEnd: boolean;
  onOpen: () => void;
  onLongPress?: () => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  if (loadFailed) {
    return (
      <Pressable
        onPress={onOpen}
        disabled={selectionMode}
        style={[
          styles.imageFrame,
          styles.imageFrameFailed,
          {
            width: CHAT_IMAGE_BOX_SIZE,
            height: CHAT_IMAGE_BOX_SIZE,
            alignSelf: alignEnd ? "flex-end" : "flex-start",
          },
        ]}
      >
        <MaterialCommunityIcons name="image-broken-variant" size={28} color={c.blue500} />
        <Text style={styles.imageFailedText}>Tap to open in browser</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onLongPress}
      delayLongPress={280}
      disabled={selectionMode}
      style={({ pressed }) => [
        styles.imageFrame,
        {
          width: CHAT_IMAGE_BOX_SIZE,
          height: CHAT_IMAGE_BOX_SIZE,
          alignSelf: alignEnd ? "flex-end" : "flex-start",
        },
        pressed && !selectionMode && styles.pressed,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: CHAT_IMAGE_BOX_SIZE, height: CHAT_IMAGE_BOX_SIZE }}
        contentFit="contain"
        cachePolicy="memory-disk"
        accessibilityLabel="Chat image"
        onError={() => setLoadFailed(true)}
      />
    </Pressable>
  );
}

export function OrderChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string; memberName?: string }>();
  const { user, role } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const initialMemberName = typeof params.memberName === "string" ? params.memberName.trim() : "";
  const [headerTitle, setHeaderTitle] = useState(initialMemberName);
  const [headerTitleVerified, setHeaderTitleVerified] = useState(false);
  const [headerSubtitle, setHeaderSubtitle] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<{ uri: string; mimeType?: string | null }[]>(
    [],
  );
  const [uploadingMessages, setUploadingMessages] = useState<PendingUploadMessage[]>([]);
  const listRef = useRef<FlatList<DisplayChatItem>>(null);
  const chatScrollViewRef = useRef<React.ElementRef<typeof KeyboardChatScrollView>>(null);
  const shouldSnapToLatestRef = useRef(true);

  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const canLoad = Boolean(orderId && user?.id);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages],
  );
  const displayMessages = useMemo<DisplayChatItem[]>(() => {
    const sentItems = orderedMessages.map((item) => ({ kind: "sent", item }) as const);
    const uploadingItems = uploadingMessages.map((item) => ({ kind: "uploading", item }) as const);
    return [...sentItems, ...uploadingItems].sort(
      (a, b) => +new Date(a.item.createdAt) - +new Date(b.item.createdAt),
    );
  }, [orderedMessages, uploadingMessages]);
  const selectionMode = selectedMessageIds.length > 0;
  const selectableMessageIds = useMemo(
    () => orderedMessages.filter((m) => m.senderId === user?.id).map((m) => m.id),
    [orderedMessages, user?.id],
  );

  const appendUniqueMessages = useCallback((rows: ChatMessage[]) => {
    setMessages((prev) => {
      if (rows.length === 0) return prev;
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const row of rows) {
        // Keep first-seen row to preserve local timeline position for freshly uploaded images.
        if (!byId.has(row.id)) byId.set(row.id, row);
      }
      return Array.from(byId.values());
    });
  }, []);

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
      const header = await fetchOrderChatHeader(orderId, user.id);
      setHeaderTitle(header.title);
      setHeaderTitleVerified(Boolean(header.titleVerified));
      setHeaderSubtitle(header.subtitle);
      const rows = await fetchConversationMessages(convId);
      // Ensure opening the chat lands on the latest message.
      shouldSnapToLatestRef.current = true;
      setMessages(rows);
      setSelectedMessageIds([]);
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
            const row = payload.new as Parameters<typeof normalizeChatMessageRow>[0];

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, normalizeChatMessageRow(row)];
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
            setSelectedMessageIds((prev) => prev.filter((id) => id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (displayMessages.length === 0) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [displayMessages.length]);

  const onSend = async () => {
    if (!conversationId || !user?.id || sending) return;
    const next = draft.trim();
    if (!next && pendingImages.length === 0) return;
    const pending = pendingImages;

    setSending(true);
    try {
      setDraft("");
      setPendingImages([]);

      if (pending.length === 0) {
        const sent = await sendConversationMessage(conversationId, user.id, next);
        appendUniqueMessages([sent]);
      } else {
        const startedAt = Date.now();
        const pendingUploadRows: PendingUploadMessage[] = pending.map((item, idx) => ({
          tempId: `upload-${startedAt}-${idx}`,
          localUri: item.uri,
          createdAt: new Date(startedAt + idx).toISOString(),
          body: idx === 0 ? next : "",
          progress: 0.05,
          statusText: "Waiting...",
        }));
        setUploadingMessages((prev) => [...prev, ...pendingUploadRows]);

        for (let i = 0; i < pending.length; i++) {
          const item = pending[i]!;
          const row = pendingUploadRows[i]!;
          setUploadingMessages((prev) =>
            prev.map((upload) =>
              upload.tempId === row.tempId
                ? { ...upload, progress: 0.15, statusText: "Uploading image..." }
                : upload,
            ),
          );
          const publicUrl = await uploadChatImage(item.uri, conversationId, user.id, item.mimeType);
          setUploadingMessages((prev) =>
            prev.map((upload) =>
              upload.tempId === row.tempId
                ? { ...upload, progress: 0.8, statusText: "Sending message..." }
                : upload,
            ),
          );
          const body = i === 0 ? next : "";
          const sent = await sendConversationMessage(conversationId, user.id, body, publicUrl);
          appendUniqueMessages([{ ...sent, createdAt: row.createdAt }]);
          setUploadingMessages((prev) => prev.filter((upload) => upload.tempId !== row.tempId));
        }
      }
      await markConversationRead(conversationId, user.id);
    } catch (e) {
      setDraft(next);
      if (pending.length > 0) setPendingImages(pending);
      setUploadingMessages([]);
      setError(e instanceof Error ? e.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    );
  }, []);

  const onPickImage = useCallback(
    async (source: "camera" | "library") => {
      if (!conversationId || !user?.id || sending) return;

      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          source === "camera"
            ? "Camera access is required to take a photo."
            : "Photo library access is required to attach an image.",
        );
        return;
      }

      const launch =
        source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await launch({
        mediaTypes: ["images"],
        quality: 0.72,
        ...(source === "library" ? { allowsMultipleSelection: true, selectionLimit: 10 } : {}),
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      setError(null);
      const nextImages = result.assets
        .filter((asset) => Boolean(asset.uri))
        .map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType }));
      if (nextImages.length === 0) return;
      setPendingImages((prev) => [...prev, ...nextImages]);
    },
    [conversationId, sending, user?.id],
  );

  const onOpenCamera = useCallback(() => {
    void onPickImage("camera");
  }, [onPickImage]);

  const onOpenGallery = useCallback(() => {
    void onPickImage("library");
  }, [onPickImage]);

  const onDeleteSelectedMessages = useCallback(() => {
    if (!user?.id || selectedMessageIds.length === 0) return;

    Alert.alert(
      "Delete selected messages",
      `Delete ${selectedMessageIds.length} selected message${selectedMessageIds.length > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteConversationMessages(selectedMessageIds, user.id);
                const selectedSet = new Set(selectedMessageIds);
                setMessages((prev) => prev.filter((m) => !selectedSet.has(m.id)));
                setSelectedMessageIds([]);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to delete messages.");
              }
            })();
          },
        },
      ],
    );
  }, [selectedMessageIds, user?.id]);

  const onSelectAllMessages = useCallback(() => {
    if (selectableMessageIds.length === 0) return;
    setSelectedMessageIds((prev) =>
      prev.length === selectableMessageIds.length ? [] : selectableMessageIds,
    );
  }, [selectableMessageIds]);

  const composerBottomPad = Math.max(insets.bottom, 10);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      chatScrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const focusComposer = useCallback(() => {
    scrollToLatest(false);
    scrollToLatest(true);
    setTimeout(() => scrollToLatest(true), 80);
    setTimeout(() => scrollToLatest(true), 250);
  }, [scrollToLatest]);

  useKeyboardHandler(
    {
      onEnd: (e) => {
        "worklet";
        if (e.height > 0) {
          runOnJS(scrollToLatest)(true);
        }
      },
    },
    [scrollToLatest],
  );

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => (
      <ChatListScrollView {...props} chatScrollViewRef={chatScrollViewRef} />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <AppHeader
          title={selectionMode ? `${selectedMessageIds.length} selected` : headerTitle}
          titleVerified={!selectionMode && headerTitleVerified}
          subtitle={selectionMode ? null : headerSubtitle}
          leftIcon="arrow-left"
          onLeftPress={() => {
            if (selectionMode) {
              setSelectedMessageIds([]);
              return;
            }
            router.back();
          }}
          rightElement={
            selectionMode ? (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={onSelectAllMessages}
                  style={({ pressed }) => [styles.headerActionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.headerActionText}>
                    {selectedMessageIds.length > 0 &&
                    selectedMessageIds.length === selectableMessageIds.length
                      ? "Clear"
                      : "Select all"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onDeleteSelectedMessages}
                  style={({ pressed }) => [styles.headerActionBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={c.white} />
                </Pressable>
              </View>
            ) : null
          }
          leftAccessibilityLabel="Go back"
        />
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
        <KeyboardGestureArea
          style={styles.body}
          interpolator="ios"
          textInputNativeID={CHAT_INPUT_NATIVE_ID}
        >
          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={displayMessages}
            renderScrollComponent={renderScrollComponent}
            keyExtractor={(row) => (row.kind === "sent" ? row.item.id : `uploading-${row.item.tempId}`)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (!shouldSnapToLatestRef.current) return;
              requestAnimationFrame(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: false });
                shouldSnapToLatestRef.current = false;
              });
            }}
            renderItem={({ item: row }) => {
              const isUploading = row.kind === "uploading";
              const sentItem = row.kind === "sent" ? row.item : null;
              const uploadItem = row.kind === "uploading" ? row.item : null;
              const mine = isUploading ? true : sentItem?.senderId === user?.id;
              const isSelected = sentItem ? selectedMessageIds.includes(sentItem.id) : false;
              const isRiderAssignment =
                sentItem?.messageType === "rider_assignment" && sentItem.metadata;

              if (isRiderAssignment) {
                return (
                  <View style={styles.riderAssignmentWrap}>
                    <RiderAssignmentMessage
                      metadata={sentItem.metadata!}
                      role={role}
                      intro={sentItem.body.trim() || undefined}
                    />
                    <Text style={styles.riderAssignmentTime}>
                      {formatClock(sentItem.createdAt)}
                    </Text>
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.bubbleWrap,
                    mine ? styles.bubbleWrapMine : styles.bubbleWrapOther,
                    selectionMode && mine && styles.bubbleWrapMineSelecting,
                  ]}
                >
                  {selectionMode && mine ? (
                    <View
                      style={[
                        styles.selectionCheckboxOutside,
                        isSelected && styles.selectionCheckboxChecked,
                      ]}
                    >
                      {isSelected ? (
                        <MaterialCommunityIcons name="check" size={12} color={c.background} />
                      ) : null}
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      if (isUploading) return;
                      if (selectionMode && mine && sentItem) {
                        toggleMessageSelection(sentItem.id);
                      }
                    }}
                    onLongPress={() => {
                      if (isUploading) return;
                      if (!sentItem) return;
                      if (!mine) return;
                      if (selectionMode) {
                        toggleMessageSelection(sentItem.id);
                        return;
                      }
                      setSelectedMessageIds([sentItem.id]);
                    }}
                    delayLongPress={280}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubbleOther,
                        selectionMode && isSelected && styles.bubbleSelected,
                      ]}
                    >
                      {!isUploading && sentItem?.imageUrl ? (
                        <ChatMessageImage
                          uri={sentItem.imageUrl}
                          selectionMode={selectionMode}
                          alignEnd={mine}
                          onOpen={() => {
                            if (selectionMode) return;
                            setPreviewImageUrl(sentItem.imageUrl!);
                          }}
                          onLongPress={() => {
                            if (!sentItem) return;
                            if (!mine) return;
                            if (selectionMode) {
                              toggleMessageSelection(sentItem.id);
                              return;
                            }
                            setSelectedMessageIds([sentItem.id]);
                          }}
                        />
                      ) : isUploading ? (
                        <View style={styles.uploadingImageWrap}>
                          <Image
                            source={{ uri: uploadItem?.localUri }}
                            style={styles.uploadingImage}
                            contentFit="cover"
                            accessibilityLabel="Uploading image"
                          />
                          <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="small" color={c.white} />
                            <Text style={styles.uploadingText}>{uploadItem?.statusText}</Text>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { width: `${Math.max(4, Math.round((uploadItem?.progress ?? 0) * 100))}%` },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      ) : null}
                      {(uploadItem?.body ?? sentItem?.body ?? "").trim() ? (
                        <Text
                          style={
                            !isUploading && sentItem?.imageUrl
                              ? [styles.bubbleText, styles.bubbleCaption]
                              : styles.bubbleText
                          }
                        >
                          {uploadItem?.body ?? sentItem?.body}
                        </Text>
                      ) : null}
                      <Text style={styles.bubbleTime}>
                        {isUploading
                          ? `${Math.max(1, Math.round((uploadItem?.progress ?? 0) * 100))}%`
                          : formatClock(sentItem?.createdAt ?? new Date().toISOString())}
                      </Text>
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

          <KeyboardStickyView
            offset={{ closed: 0, opened: Math.max(insets.bottom - 10, 0) }}
            style={styles.composerSticky}
          >
            <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
            {pendingImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pendingImagesRow}
                style={styles.pendingImagesTray}
              >
                {pendingImages.map((img, idx) => (
                  <View key={`${img.uri}-${idx}`} style={styles.pendingImageWrap}>
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.pendingImageThumb}
                      contentFit="cover"
                      accessibilityLabel="Pending image attachment"
                    />
                    <Pressable
                      style={styles.pendingImageRemoveBtn}
                      onPress={() =>
                        setPendingImages((prev) => prev.filter((_, removeIdx) => removeIdx !== idx))
                      }
                      disabled={sending}
                      accessibilityLabel="Remove image attachment"
                    >
                      <MaterialCommunityIcons name="close" size={12} color={c.white} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.composerRow}>
              <View style={styles.inputShell}>
                <TextInput
                  nativeID={CHAT_INPUT_NATIVE_ID}
                  value={draft}
                  onChangeText={setDraft}
                  onFocus={focusComposer}
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
                {Platform.OS !== "web" ? (
                  <>
                    <Pressable
                      onPress={onOpenGallery}
                      disabled={sending}
                      style={({ pressed }) => [
                        styles.cameraInInputBtn,
                        sending && styles.attachBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="Open gallery"
                    >
                      <MaterialCommunityIcons name="paperclip" size={20} color={c.white} />
                    </Pressable>
                    <Pressable
                      onPress={onOpenCamera}
                      disabled={sending}
                      style={({ pressed }) => [
                        styles.cameraInInputBtn,
                        sending && styles.attachBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="Open camera"
                    >
                      <MaterialCommunityIcons name="camera-outline" size={22} color={c.white} />
                    </Pressable>
                  </>
                ) : null}
              </View>
              <Pressable
                onPress={onSend}
                disabled={sending || (!draft.trim() && pendingImages.length === 0)}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (sending || (!draft.trim() && pendingImages.length === 0)) && styles.sendBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons name="send" size={20} color={c.white} />
              </Pressable>
            </View>
            </View>
          </KeyboardStickyView>
        </KeyboardGestureArea>
      )}
      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            style={styles.previewCloseBtn}
            onPress={() => setPreviewImageUrl(null)}
            accessibilityLabel="Close image preview"
          >
            <MaterialCommunityIcons name="close" size={26} color={c.white} />
          </Pressable>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewImageUrl(null)}>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.previewImage}
                contentFit="contain"
                accessibilityLabel="Full size chat image"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeTop: {
    paddingBottom: 8,
  },
  headerActionBtn: {
    // width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  headerTitle: {
    color: c.white,
    fontSize: fs.titleMedium,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 2,
    color: c.blue500,
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  body: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bubbleWrapMine: {
    justifyContent: "flex-end",
  },
  bubbleWrapMineSelecting: {
    width: "100%",
    justifyContent: "space-between",
    gap: 0,
  },
  bubbleWrapOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "100%",
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
  bubbleSelected: {
    borderWidth: 2,
    borderColor: c.white,
  },
  selectionCheckboxOutside: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: c.white,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCheckboxChecked: {
    backgroundColor: c.white,
  },
  imageFrame: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.18)",
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  imageFrameFailed: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  imageFailedText: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    textAlign: "center",
  },
  uploadingImageWrap: {
    width: CHAT_IMAGE_BOX_SIZE,
    height: CHAT_IMAGE_BOX_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.18)",
    alignSelf: "flex-end",
  },
  uploadingImage: {
    width: "100%",
    height: "100%",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  uploadingText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  progressTrack: {
    width: "88%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: c.white,
  },
  bubbleCaption: {
    marginTop: 8,
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
  attachBtn: {
    // kept for backward compatibility in case reused later
    width: 0,
    height: 0,
  },
  pendingImageThumb: {
    width: "100%",
    height: "100%",
  },
  pendingImageRemoveBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  composerSticky: {
    flexShrink: 0,
    backgroundColor: c.background,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: PAD,
    paddingTop: 10,
    gap: 8,
    backgroundColor: c.background,
  },
  pendingImagesTray: {
    maxHeight: 40,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    paddingLeft: 8,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingImageWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.outline,
    marginRight: 6,
  },
  pendingImagesRow: {
    paddingRight: 2,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    color: c.white,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fs.smallText,
  },
  cameraInInputBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  attachBtnDisabled: {
    opacity: 0.45,
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
  riderAssignmentWrap: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
    width: "100%",
  },
  riderAssignmentTime: {
    fontSize: fs.xxSmallText,
    color: c.blue500,
  },
  pressed: {
    opacity: 0.85,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 52,
    right: 16,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  previewBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
});
