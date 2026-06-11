import * as FileSystem from "expo-file-system";

import { supabase } from "@/lib/supabase";

const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence";
const MAX_PHOTOS = 3;

export type OrderDisputeCategory =
  | "damaged_items"
  | "missed_pickup"
  | "billing"
  | "delivery_delay"
  | "wrong_items"
  | "other";

export type SubmitOrderDisputeInput = {
  orderId: string;
  customerId: string;
  partnerId: string;
  description: string;
  category?: OrderDisputeCategory;
  photoUris?: string[];
  photoMimeTypes?: (string | null | undefined)[];
};

function extAndContentType(
  localUri: string,
  mimeType?: string | null,
): { ext: string; contentType: string } {
  const lower = localUri.toLowerCase();
  if (mimeType?.includes("png") || lower.endsWith(".png")) {
    return { ext: "png", contentType: "image/png" };
  }
  if (mimeType?.includes("webp") || lower.endsWith(".webp")) {
    return { ext: "webp", contentType: "image/webp" };
  }
  if (mimeType?.includes("heic") || lower.endsWith(".heic")) {
    return { ext: "heic", contentType: "image/heic" };
  }
  return { ext: "jpg", contentType: "image/jpeg" };
}

export async function uploadDisputeEvidence(
  localUri: string,
  customerId: string,
  orderId: string,
  mimeType?: string | null,
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { ext, contentType } = extAndContentType(localUri, mimeType);
  const objectId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${customerId}/${orderId}/${objectId}.${ext}`;

  const file = new FileSystem.File(localUri);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(DISPUTE_EVIDENCE_BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export async function submitOrderDispute(
  input: SubmitOrderDisputeInput,
): Promise<{ ok: true; disputeId: string } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const description = input.description.trim();
  if (!description) {
    return { ok: false, error: "Please describe the problem." };
  }

  const photoUris = (input.photoUris ?? []).slice(0, MAX_PHOTOS);
  const imageUrls: string[] = [];

  try {
    for (let i = 0; i < photoUris.length; i++) {
      const uri = photoUris[i];
      if (!uri) continue;
      const url = await uploadDisputeEvidence(
        uri,
        input.customerId,
        input.orderId,
        input.photoMimeTypes?.[i],
      );
      imageUrls.push(url);
    }

    const { data, error } = await supabase
      .from("order_disputes")
      .insert({
        order_id: input.orderId,
        customer_id: input.customerId,
        partner_id: input.partnerId,
        category: input.category ?? "other",
        description,
        image_urls: imageUrls,
        status: "open",
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, disputeId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit report.";
    return { ok: false, error: message };
  }
}

export async function hasCustomerOrderDispute(
  customerId: string,
  orderId: string,
): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("order_disputes")
    .select("id")
    .eq("customer_id", customerId)
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[order-disputes] lookup failed:", error.message);
    return false;
  }

  return Boolean(data);
}
