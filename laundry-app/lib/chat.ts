import * as FileSystem from "expo-file-system";

import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

const CHAT_IMAGES_BUCKET = "chat-images";

type ConversationRow = {
  id: string;
  order_id: string;
};

type OrderOwnerRow = {
  id: string;
  customer_id: string;
  partner_id: string;
  status?: string;
};

type ProfileNameRow = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url?: string | null;
};

type PartnerNameRow = {
  business_name: string | null;
  image_url?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

type ConversationParticipantRow = {
  conversation_id: string;
  last_read_at: string | null;
};

type ConversationHeaderRow = {
  id: string;
  order_id: string;
  updated_at: string;
};

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface OrderChatHeaderData {
  title: string;
  subtitle: string;
}

export interface ChatConversationListItem {
  conversationId: string;
  orderId: string;
  orderRef: string;
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
  orderStatus: string;
  servicesSummary: string;
  estimatedTotalLabel: string;
  placedAtLabel: string;
}

type OrderServiceType = "washAndFold" | "dryCleaning" | "tailoring";

function serviceTypeLabel(serviceType: OrderServiceType): string {
  switch (serviceType) {
    case "washAndFold":
      return "Wash & Fold";
    case "dryCleaning":
      return "Dry Cleaning";
    case "tailoring":
      return "Tailoring";
    default:
      return serviceType;
  }
}

function summarizeServiceTypes(types: OrderServiceType[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const type of types) {
    const label = serviceTypeLabel(type);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.join(", ");
}

function formatMoneyLabel(amount: number | null | undefined): string {
  const safe = Number(amount ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `Rs ${formatted}`;
}

function formatPlacedLabel(valueIso: string | null | undefined): string {
  if (!valueIso) return "—";
  const d = new Date(valueIso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatOrderRef(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function humanizeStatus(status: string | null | undefined): string {
  if (!status?.trim()) return "Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCustomerName(profile: ProfileNameRow | null): string {
  if (!profile) return "Customer";
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return joined || "Customer";
}

function mapRoleToChatRole(role: UserRole | null): "customer" | "launderer" {
  return role === "launderer" ? "launderer" : "customer";
}

export async function ensureOrderConversation(
  orderId: string,
  userId: string,
  role: UserRole | null,
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: existing, error: existingError } = await supabase
    .from("chat_conversations")
    .select("id,order_id")
    .eq("order_id", orderId)
    .maybeSingle<ConversationRow>();
  if (existingError) throw new Error(existingError.message);

  const { data: order, error: orderError } = await supabase
    .from("customer_orders")
    .select("id,customer_id,partner_id")
    .eq("id", orderId)
    .maybeSingle<OrderOwnerRow>();
  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Order not found.");
  if (order.customer_id !== userId && order.partner_id !== userId) {
    throw new Error("You are not allowed to chat on this order.");
  }

  let conversationId = existing?.id ?? "";
  if (!conversationId) {
    const { data: inserted, error: insertError } = await supabase
      .from("chat_conversations")
      .insert({
        order_id: orderId,
        created_by: userId,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    conversationId = inserted?.id ?? "";

    // Handle race: both participants creating at the same time.
    if (insertError && !conversationId) {
      const { data: raceRow, error: raceError } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle<{ id: string }>();
      if (raceError || !raceRow) {
        throw new Error(insertError.message);
      }
      conversationId = raceRow.id;
    }
  }

  if (!conversationId) {
    throw new Error("Could not create chat conversation.");
  }

  const { error: participantError } = await supabase
    .from("chat_conversation_participants")
    .upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        role: mapRoleToChatRole(role),
      },
      { onConflict: "conversation_id,user_id" },
    );
  if (participantError) {
    throw new Error(participantError.message);
  }

  return conversationId;
}

export async function fetchOrderChatHeader(
  orderId: string,
  userId: string,
): Promise<OrderChatHeaderData> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: order, error: orderError } = await supabase
    .from("customer_orders")
    .select("id,customer_id,partner_id,status")
    .eq("id", orderId)
    .maybeSingle<OrderOwnerRow>();
  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Order not found.");
  if (order.customer_id !== userId && order.partner_id !== userId) {
    throw new Error("You are not allowed to view this chat.");
  }

  let title = "Order chat";
  if (order.customer_id === userId) {
    const { data: partnerData } = await supabase
      .from("partner_profiles")
      .select("business_name")
      .eq("id", order.partner_id)
      .maybeSingle<PartnerNameRow>();
    title = partnerData?.business_name?.trim() || "Launderer";
  } else {
    const { data: customerData } = await supabase
      .from("profiles")
      .select("full_name,first_name,last_name")
      .eq("id", order.customer_id)
      .maybeSingle<ProfileNameRow>();
    title = formatCustomerName(customerData ?? null);
  }

  return {
    title,
    subtitle: `Order #${formatOrderRef(order.id)} · ${humanizeStatus(order.status)}`,
  };
}

export async function fetchConversationMessages(
  conversationId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,conversation_id,sender_id,body,image_url,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body ?? "",
    imageUrl: row.image_url,
    createdAt: row.created_at,
  }));
}

export async function fetchMyConversations(
  userId: string,
): Promise<ChatConversationListItem[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: participantData, error: participantError } = await supabase
    .from("chat_conversation_participants")
    .select("conversation_id,last_read_at")
    .eq("user_id", userId);
  if (participantError) throw new Error(participantError.message);

  const participantRows = (participantData ?? []) as ConversationParticipantRow[];
  const conversationIds = participantRows.map((row) => row.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: conversationData, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id,order_id,updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });
  if (conversationError) throw new Error(conversationError.message);

  const conversations = (conversationData ?? []) as ConversationHeaderRow[];
  const orderIds = conversations.map((row) => row.order_id);
  if (orderIds.length === 0) return [];

  const { data: orderData, error: orderError } = await supabase
    .from("customer_orders")
    .select(
      "id,customer_id,partner_id,status,estimated_total,estimated_partial_total,submitted_at,created_at",
    )
    .in("id", orderIds);
  if (orderError) throw new Error(orderError.message);

  const orders = (orderData ?? []) as Array<
    OrderOwnerRow & {
      estimated_total?: number | null;
      estimated_partial_total?: number | null;
      submitted_at?: string | null;
      created_at?: string | null;
    }
  >;
  const orderById = new Map(orders.map((row) => [row.id, row]));

  const { data: serviceData, error: serviceError } = await supabase
    .from("order_services")
    .select("order_id,service_type")
    .in("order_id", orderIds);
  if (serviceError) throw new Error(serviceError.message);
  const serviceTypesByOrderId = new Map<string, OrderServiceType[]>();
  for (const row of (serviceData ?? []) as Array<{
    order_id: string;
    service_type: OrderServiceType;
  }>) {
    const list = serviceTypesByOrderId.get(row.order_id) ?? [];
    list.push(row.service_type);
    serviceTypesByOrderId.set(row.order_id, list);
  }

  const counterpartCustomerIds = new Set<string>();
  const counterpartPartnerIds = new Set<string>();
  for (const order of orders) {
    if (order.customer_id === userId) counterpartPartnerIds.add(order.partner_id);
    if (order.partner_id === userId) counterpartCustomerIds.add(order.customer_id);
  }

  const customerProfileMap = new Map<string, ProfileNameRow>();
  const partnerNameMap = new Map<string, PartnerNameRow>();
  const partnerProfileMap = new Map<string, ProfileNameRow>();

  if (counterpartCustomerIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,image_url")
      .in("id", Array.from(counterpartCustomerIds));
    for (const row of (data ?? []) as Array<ProfileNameRow & { id: string }>) {
      customerProfileMap.set(row.id, row);
    }
  }
  if (counterpartPartnerIds.size > 0) {
    const { data } = await supabase
      .from("partner_profiles")
      .select("id,business_name,image_url")
      .in("id", Array.from(counterpartPartnerIds));
    for (const row of (data ?? []) as Array<PartnerNameRow & { id: string }>) {
      partnerNameMap.set(row.id, row);
    }

    const { data: partnerProfileData } = await supabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,image_url")
      .in("id", Array.from(counterpartPartnerIds));
    for (const row of (partnerProfileData ?? []) as Array<ProfileNameRow & { id: string }>) {
      partnerProfileMap.set(row.id, row);
    }
  }

  const { data: messageData, error: messageError } = await supabase
    .from("chat_messages")
    .select("conversation_id,sender_id,body,image_url,created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });
  if (messageError) throw new Error(messageError.message);

  const latestByConversation = new Map<
    string,
    { sender_id: string; body: string | null; image_url: string | null; created_at: string }
  >();
  const unreadByConversation = new Map<string, number>();
  const readMap = new Map(
    participantRows.map((row) => [row.conversation_id, row.last_read_at]),
  );
  for (const row of (messageData ?? []) as Array<{
    conversation_id: string;
    sender_id: string;
    body: string | null;
    image_url: string | null;
    created_at: string;
  }>) {
    if (!latestByConversation.has(row.conversation_id)) {
      latestByConversation.set(row.conversation_id, row);
    }
    if (row.sender_id === userId) continue;
    const lastReadAt = readMap.get(row.conversation_id);
    const isUnread =
      !lastReadAt || new Date(row.created_at).getTime() > new Date(lastReadAt).getTime();
    if (isUnread) {
      unreadByConversation.set(
        row.conversation_id,
        (unreadByConversation.get(row.conversation_id) ?? 0) + 1,
      );
    }
  }

  return conversations.map((conversation) => {
    const order = orderById.get(conversation.order_id);
    const latest = latestByConversation.get(conversation.id);

    let counterpartyName = "User";
    let counterpartyAvatarUrl: string | null = null;
    if (order?.customer_id === userId) {
      const p = partnerNameMap.get(order.partner_id);
      const pProfile = partnerProfileMap.get(order.partner_id);
      counterpartyName = p?.business_name?.trim() || "Launderer";
      counterpartyAvatarUrl = p?.image_url ?? pProfile?.image_url ?? null;
    } else if (order?.partner_id === userId) {
      const c = customerProfileMap.get(order.customer_id);
      counterpartyName = formatCustomerName(c ?? null);
      counterpartyAvatarUrl = c?.image_url ?? null;
    }

    const preview =
      latest?.body?.trim() ||
      (latest?.image_url ? "Photo" : "") ||
      "No messages yet";

    return {
      conversationId: conversation.id,
      orderId: conversation.order_id,
      orderRef: formatOrderRef(conversation.order_id),
      counterpartyName,
      counterpartyAvatarUrl,
      lastMessageBody: preview,
      lastMessageAt: latest?.created_at || conversation.updated_at,
      unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      orderStatus: humanizeStatus(order?.status),
      servicesSummary:
        summarizeServiceTypes(serviceTypesByOrderId.get(conversation.order_id) ?? []) ||
        "Laundry order",
      estimatedTotalLabel: formatMoneyLabel(
        order?.estimated_total ?? order?.estimated_partial_total ?? 0,
      ),
      placedAtLabel: formatPlacedLabel(order?.submitted_at ?? order?.created_at ?? null),
    };
  });
}

function extAndContentType(uri: string, mimeType?: string | null): { ext: string; contentType: string } {
  const m = (mimeType ?? "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return { ext: "jpg", contentType: "image/jpeg" };
  if (m.includes("png")) return { ext: "png", contentType: "image/png" };
  if (m.includes("heic")) return { ext: "heic", contentType: "image/heic" };
  const lower = uri.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return { ext: "jpg", contentType: "image/jpeg" };
  if (lower.endsWith(".png")) return { ext: "png", contentType: "image/png" };
  if (lower.endsWith(".heic")) return { ext: "heic", contentType: "image/heic" };
  return { ext: "jpg", contentType: "image/jpeg" };
}

export async function uploadChatImage(
  localUri: string,
  conversationId: string,
  userId: string,
  mimeType?: string | null,
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { ext, contentType } = extAndContentType(localUri, mimeType);

  const objectId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${userId}/${conversationId}/${objectId}.${ext}`;

  const file = new FileSystem.File(localUri);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export async function sendConversationMessage(
  conversationId: string,
  senderId: string,
  body: string,
  imageUrl?: string | null,
): Promise<ChatMessage> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const trimmedBody = body.trim();
  const trimmedImage = (imageUrl ?? "").trim();
  if (!trimmedBody && !trimmedImage) {
    throw new Error("Cannot send an empty message.");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmedBody.length > 0 ? trimmedBody : null,
      image_url: trimmedImage.length > 0 ? trimmedImage : null,
    })
    .select("id,conversation_id,sender_id,body,image_url,created_at")
    .maybeSingle<MessageRow>();
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to send message.");
  }

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    body: data.body ?? "",
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("chat_conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function deleteConversationMessage(
  messageId: string,
  userId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteConversationMessages(
  messageIds: string[],
  userId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (messageIds.length === 0) return;

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .in("id", messageIds)
    .eq("sender_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
