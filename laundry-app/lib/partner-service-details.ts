import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const SERVICE_DETAIL_CATEGORIES = {
  washAndFold: "Wash & Fold",
  dryCleaning: "Dry Cleaning",
  press: "Press",
  tailoring: "Tailoring",
} as const;

export type ServiceDetailKey = keyof typeof SERVICE_DETAIL_CATEGORIES;
export type ServiceDetailCategory =
  (typeof SERVICE_DETAIL_CATEGORIES)[ServiceDetailKey];

const BUCKET = "service-images";

export type PartnerServiceDetail = {
  images: string[];
  serviceTypes: string[];
  measurementMode: string | null;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function fetchPartnerServiceDetail(
  partnerId: string,
  category: ServiceDetailCategory,
): Promise<PartnerServiceDetail | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("partner_service_details")
    .select("images, service_types, measurement_mode")
    .eq("user_id", partnerId)
    .eq("category", category)
    .maybeSingle<{
      images: unknown;
      service_types: string[] | null;
      measurement_mode: string | null;
    }>();

  if (error || !data) return null;

  return {
    images: asStringList(data.images),
    serviceTypes: data.service_types ?? [],
    measurementMode: data.measurement_mode,
  };
}

async function uploadOneImage(
  partnerId: string,
  category: ServiceDetailCategory,
  localUri: string,
  index: number,
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  let bytes: ArrayBuffer;
  let contentType: string;
  let ext: string;

  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    bytes = await response.arrayBuffer();
    const mime = (response.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    contentType = mime;
    ext = mime === "image/png" ? "png" : "jpg";
  } else {
    const FileSystem = await import("expo-file-system");
    const lower = localUri.toLowerCase();
    const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    ext = isJpeg ? "jpg" : "png";
    contentType = isJpeg ? "image/jpeg" : "image/png";
    const file = new FileSystem.File(localUri);
    bytes = await file.arrayBuffer();
  }

  const folder = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${partnerId}/${folder}/${Date.now()}-${index}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function savePartnerServiceDetail(input: {
  partnerId: string;
  category: ServiceDetailCategory;
  images: string[];
  serviceTypes?: string[];
  measurementMode?: string | null;
}): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  try {
    const uploaded: string[] = [];
    for (let index = 0; index < input.images.length; index += 1) {
      const uri = input.images[index];
      if (/^https?:\/\//i.test(uri)) {
        uploaded.push(uri);
        continue;
      }
      uploaded.push(await uploadOneImage(input.partnerId, input.category, uri, index));
    }

    const isTailoring = input.category === "Tailoring";
    const { error } = await supabase.from("partner_service_details").upsert(
      {
        user_id: input.partnerId,
        category: input.category,
        images: uploaded,
        service_types: isTailoring ? input.serviceTypes ?? [] : [],
        measurement_mode: isTailoring ? input.measurementMode ?? null : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, images: uploaded };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not save service images.";
    return { ok: false, error: message };
  }
}
