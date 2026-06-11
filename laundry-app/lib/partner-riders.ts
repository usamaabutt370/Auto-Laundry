import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PartnerRider = {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  photoUrl: string;
};

export type PartnerRiderInput = {
  name: string;
  phone: string;
  photoUrl: string;
};

type PartnerRiderRow = {
  id: string;
  partner_id: string;
  name: string;
  phone: string;
  photo_url: string;
};

function mapRow(row: PartnerRiderRow): PartnerRider {
  return {
    id: row.id,
    partnerId: row.partner_id,
    name: row.name,
    phone: row.phone,
    photoUrl: row.photo_url,
  };
}

export async function fetchPartnerRiders(partnerId: string): Promise<PartnerRider[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("partner_riders")
    .select("id, partner_id, name, phone, photo_url")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[partner-riders] fetch failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as PartnerRiderRow));
}

export async function replacePartnerRiders(
  partnerId: string,
  riders: PartnerRiderInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const normalized = riders
    .map((rider) => ({
      name: rider.name.trim(),
      phone: rider.phone.trim(),
      photoUrl: rider.photoUrl.trim(),
    }))
    .filter((rider) => rider.name.length > 0 && rider.phone.length > 0 && rider.photoUrl.length > 0);

  const { error: deleteError } = await supabase
    .from("partner_riders")
    .delete()
    .eq("partner_id", partnerId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (normalized.length === 0) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("partner_riders").insert(
    normalized.map((rider) => ({
      partner_id: partnerId,
      name: rider.name,
      phone: rider.phone,
      photo_url: rider.photoUrl,
      updated_at: now,
    })),
  );

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

export async function uploadRiderPhoto(
  partnerId: string,
  localUri: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  try {
    const FileSystem = await import("expo-file-system");
    const lower = localUri.toLowerCase();
    const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    const ext = isJpeg ? "jpg" : "png";
    const contentType = isJpeg ? "image/jpeg" : "image/png";
    const path = `${partnerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const file = new FileSystem.File(localUri);
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("rider-photos")
      .upload(path, bytes, { upsert: true, contentType });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from("rider-photos").getPublicUrl(path);
    return { ok: true, url: publicUrlData.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not upload rider photo.";
    return { ok: false, error: message };
  }
}
