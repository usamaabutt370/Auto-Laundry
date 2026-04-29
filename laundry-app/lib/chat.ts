import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

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
};

type PartnerNameRow = {
  business_name: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface OrderChatHeaderData {
  title: string;
  subtitle: string;
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
    .select("id,conversation_id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function sendConversationMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Cannot send an empty message.");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmed,
    })
    .select("id,conversation_id,sender_id,body,created_at")
    .maybeSingle<MessageRow>();
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to send message.");
  }

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    body: data.body,
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
