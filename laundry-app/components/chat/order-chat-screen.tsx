import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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

import { showAppAlert } from "@/components/app-alert";
import { ChatListScrollView } from "@/components/chat/chat-list-scroll-view";
import { RiderAssignmentMessage } from "@/components/chat/rider-assignment-message";
import { WebCameraCaptureModal } from "@/components/chat/web-camera-capture-modal";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { theme, UI } from "@/constants/theme";
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
  type OrderChatHeaderData,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { pickImagesFromDocument } from "@/utils/pick-images";

const fs = theme.fontSize;
const CHAT_INPUT_NATIVE_ID = "order-chat-input";
const PAD = 16;

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function chatStatusLabel(key: string): { label: string; color: string } {
  const k = key.toLowerCase();
  if (k === "cancelled" || k === "rejected") return { label: "Cancelled", color: "#B91C1C" };
  if (k === "completed") return { label: "Completed", color: "#7C3AED" };
  if (k === "ready") return { label: "On the Way", color: "#2563EB" };
  if (k === "in_progress") return { label: "In Progress", color: "#0F766E" };
  if (k === "accepted") return { label: "Confirmed", color: "#047857" };
  return { label: "Active Order", color: "#047857" };
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
        <MaterialCommunityIcons name="image-broken-variant" size={28} color={UI.muted} />
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
  const [header, setHeader] = useState<OrderChatHeaderData | null>(null);
  const [headerTitle, setHeaderTitle] = useState(initialMemberName);
  const [headerTitleVerified, setHeaderTitleVerified] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<{ uri: string; mimeType?: string | null }[]>(
    [],
  );
  const [uploadingMessages, setUploadingMessages] = useState<PendingUploadMessage[]>([]);
  const [webCameraOpen, setWebCameraOpen] = useState(false);
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
      const nextHeader = await fetchOrderChatHeader(orderId, user.id);
      setHeader(nextHeader);
      setHeaderTitle(nextHeader.title);
      setHeaderTitleVerified(Boolean(nextHeader.titleVerified));
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

      if (Platform.OS === "web") {
        if (source === "camera") {
          setWebCameraOpen(true);
          return;
        }

        const picked = await pickImagesFromDocument({ multiple: true });
        if (picked.length === 0) return;
        setError(null);
        setPendingImages((prev) => [...prev, ...picked]);
        return;
      }

      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAppAlert(
          "Permission needed",
          source === "camera"
            ? "Camera access is required to take a photo."
            : "Photo library access is required to attach an image.",
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.72,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.72,
              allowsMultipleSelection: true,
              selectionLimit: 10,
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

    showAppAlert(
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

  const statusMeta = chatStatusLabel(header?.orderStatusKey ?? "submitted");
  const canSend = draft.trim().length > 0 || pendingImages.length > 0;

  const openOrderDetail = useCallback(() => {
    if (!orderId) return;
    router.push({
      pathname: role === "launderer" ? "/(partner)/order-detail" : "/(customer)/order-detail",
      params: { orderId },
    });
  }, [orderId, role, router]);

  const onCall = useCallback(() => {
    const phone = header?.phoneNumber?.trim();
    if (!phone) {
      showAppAlert("Phone unavailable", "No phone number is available for this contact.");
      return;
    }
    void Linking.openURL(`tel:${phone}`);
  }, [header?.phoneNumber]);

  const onAttachPress = useCallback(() => {
    showAppAlert("Add attachment", "Choose a photo source", [
      { text: "Gallery", onPress: () => void onOpenGallery() },
      { text: "Camera", onPress: () => void onOpenCamera() },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [onOpenCamera, onOpenGallery]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.chatHeader}>
          <Pressable
            onPress={() => {
              if (selectionMode) {
                setSelectedMessageIds([]);
                return;
              }
              router.back();
            }}
            style={styles.headerIconBtn}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={UI.text} />
          </Pressable>

          {selectionMode ? (
            <View style={styles.headerCenter}>
              <Text style={styles.headerName}>{selectedMessageIds.length} selected</Text>
            </View>
          ) : (
            <>
              <View style={styles.headerAvatar}>
                {header?.avatarUrl ? (
                  <Image
                    source={{ uri: header.avatarUrl }}
                    style={styles.headerAvatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.headerAvatarInitial}>
                      {(headerTitle || "?").trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.headerCenter}>
                <PartnerNameWithBadge
                  name={headerTitle || "Chat"}
                  verified={headerTitleVerified}
                  numberOfLines={1}
                  badgeSize={14}
                  badgeColor="#22C55E"
                  nameStyle={styles.headerName}
                  containerStyle={styles.headerNameRow}
                />
                <Text style={styles.headerMeta} numberOfLines={1}>
                  Order #{header?.orderRef ?? "—"} ·{" "}
                  <Text style={{ color: statusMeta.color }}>{statusMeta.label}</Text>
                </Text>
              </View>
            </>
          )}

          {selectionMode ? (
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
                <MaterialCommunityIcons name="delete-outline" size={22} color={UI.text} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerActions}>
              <Pressable onPress={onCall} style={styles.headerRoundBtn} accessibilityLabel="Call">
                <MaterialCommunityIcons name="phone-outline" size={18} color={UI.text} />
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <GradientLoader />
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
          {header ? (
            <Pressable onPress={openOrderDetail} style={styles.orderCard}>
              <View style={styles.orderThumb}>
                {header.thumbnailUrl ? (
                  <Image
                    source={{ uri: header.thumbnailUrl }}
                    style={styles.orderThumbImage}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialCommunityIcons name="hanger" size={22} color={UI.purple} />
                )}
              </View>
              <View style={styles.orderCopy}>
                <Text style={styles.orderCardTitle}>Your Order</Text>
                <Text style={styles.orderCardItems} numberOfLines={1}>
                  {header.itemsSummary}
                </Text>
                {header.scheduleSummary ? (
                  <Text style={styles.orderCardSchedule} numberOfLines={1}>
                    {header.scheduleSummary}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={UI.muted} />
            </Pressable>
          ) : null}

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
                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                  ) : null}
                  {!mine ? (
                    <View style={styles.bubbleAvatar}>
                      {header?.avatarUrl ? (
                        <Image
                          source={{ uri: header.avatarUrl }}
                          style={styles.bubbleAvatarImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.bubbleAvatarFallback}>
                          <Text style={styles.bubbleAvatarInitial}>
                            {(headerTitle || "?").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
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
                    style={styles.bubblePressable}
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
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.uploadingText}>{uploadItem?.statusText}</Text>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.max(4, Math.round((uploadItem?.progress ?? 0) * 100))}%`,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      ) : null}
                      {(uploadItem?.body ?? sentItem?.body ?? "").trim() ? (
                        <Text
                          style={[
                            styles.bubbleText,
                            !isUploading && sentItem?.imageUrl ? styles.bubbleCaption : null,
                          ]}
                        >
                          {uploadItem?.body ?? sentItem?.body}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.metaRow, mine && styles.metaRowMine]}>
                      {mine && !isUploading ? (
                        <MaterialCommunityIcons name="check-all" size={14} color="#3B82F6" />
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
                      <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.composerRow}>
              <Pressable
                onPress={onAttachPress}
                disabled={sending}
                style={({ pressed }) => [
                  styles.roundComposerBtn,
                  sending && styles.attachBtnDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Add attachment"
              >
                <MaterialCommunityIcons name="plus" size={22} color={UI.text} />
              </Pressable>
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
                  placeholderTextColor={UI.muted}
                  style={styles.input}
                  multiline
                  returnKeyType="send"
                  submitBehavior="submit"
                  maxLength={1000}
                />
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
                  <MaterialCommunityIcons name="image-outline" size={20} color={UI.muted} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  if (canSend) void onSend();
                }}
                disabled={sending || !canSend}
                style={({ pressed }) => [
                  styles.roundComposerBtn,
                  canSend && styles.sendBtnActive,
                  (sending || !canSend) && styles.sendBtnDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={canSend ? "Send message" : "Voice message"}
              >
                <MaterialCommunityIcons
                  name={canSend ? "send" : "microphone-outline"}
                  size={20}
                  color={canSend ? "#FFFFFF" : UI.text}
                />
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
            <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
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
      {Platform.OS === "web" ? (
        <WebCameraCaptureModal
          visible={webCameraOpen}
          onClose={() => setWebCameraOpen(false)}
          onCapture={(image) => {
            setError(null);
            setPendingImages((prev) => [...prev, image]);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeTop: {
    backgroundColor: "#FFFFFF",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: UI.iconWell,
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  headerAvatarInitial: {
    fontSize: 16,
    color: UI.purple,
    fontFamily: "Poppins-Bold",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerNameRow: { flexShrink: 1 },
  headerName: {
    color: UI.text,
    fontSize: 15,
    fontFamily: "Poppins-Bold",
  },
  headerMeta: {
    color: UI.muted,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  headerRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionBtn: {
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
    color: UI.text,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  orderCard: {
    marginHorizontal: PAD,
    marginTop: 10,
    marginBottom: 4,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  orderThumbImage: { width: "100%", height: "100%" },
  orderCopy: { flex: 1, minWidth: 0, gap: 1 },
  orderCardTitle: {
    fontSize: 13,
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  orderCardItems: {
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  orderCardSchedule: {
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
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
    gap: 12,
  },
  bubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
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
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: UI.iconWell,
    marginBottom: 18,
  },
  bubbleAvatarImage: { width: "100%", height: "100%" },
  bubbleAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  bubbleAvatarInitial: {
    fontSize: 11,
    color: UI.purple,
    fontFamily: "Poppins-Bold",
  },
  bubblePressable: {
    maxWidth: "78%",
  },
  bubble: {
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: "#DBEAFE",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 6,
  },
  bubbleSelected: {
    borderWidth: 2,
    borderColor: UI.teal,
  },
  selectionCheckboxOutside: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: UI.teal,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCheckboxChecked: {
    backgroundColor: UI.teal,
  },
  imageFrame: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
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
    color: UI.muted,
    fontSize: fs.xxSmallText,
    textAlign: "center",
  },
  uploadingImageWrap: {
    width: CHAT_IMAGE_BOX_SIZE,
    height: CHAT_IMAGE_BOX_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
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
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
  },
  bubbleCaption: {
    marginTop: 8,
  },
  bubbleText: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaRowMine: {
    justifyContent: "flex-end",
  },
  bubbleTime: {
    color: UI.muted,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
  },
  attachBtn: {
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
    backgroundColor: "#FFFFFF",
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
    paddingHorizontal: PAD,
    paddingTop: 10,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  pendingImagesTray: {
    maxHeight: 40,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roundComposerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: UI.teal,
  },
  inputShell: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    paddingLeft: 14,
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
    marginRight: 8,
  },
  pendingImagesRow: {
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: UI.text,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  cameraInInputBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  attachBtnDisabled: {
    opacity: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    color: UI.red,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  retryText: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  pressed: { opacity: 0.88 },
  riderAssignmentWrap: {
    gap: 4,
  },
  riderAssignmentTime: {
    color: UI.muted,
    fontSize: 11,
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  previewBackdrop: {
    flex: 1,
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
