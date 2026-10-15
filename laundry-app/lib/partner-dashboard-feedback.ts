import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PartnerFeedbackDistribution = {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  percent: number;
};

export type PartnerDashboardReview = {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
  customerName: string;
  customerInitial: string;
};

export type PartnerDashboardFeedback = {
  avgRating: number | null;
  reviewCount: number;
  distribution: PartnerFeedbackDistribution[];
  recent: PartnerDashboardReview[];
};

type FeedbackRow = {
  id: string;
  rating: number;
  message: string | null;
  created_at: string;
  customer_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

function emptyDistribution(): PartnerFeedbackDistribution[] {
  return ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    count: 0,
    percent: 0,
  }));
}

function personName(profile: ProfileRow | undefined, fallback: string): string {
  if (!profile) return fallback;
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return joined || fallback;
}

export async function fetchPartnerDashboardFeedback(
  partnerId: string,
  customerFallback = "Customer",
): Promise<PartnerDashboardFeedback> {
  const empty: PartnerDashboardFeedback = {
    avgRating: null,
    reviewCount: 0,
    distribution: emptyDistribution(),
    recent: [],
  };

  if (!isSupabaseConfigured() || !supabase || !partnerId) return empty;

  const [statsResult, feedbackResult] = await Promise.all([
    supabase.rpc("partner_rating_stats", { partner_ids: [partnerId] }),
    supabase
      .from("customer_order_feedback")
      .select("id, rating, message, created_at, customer_id")
      .eq("partner_id", partnerId)
      .eq("feedback_type", "feedback")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const ratingRow = ((statsResult.data ?? []) as Array<{
    avg_rating?: number | string;
    review_count?: number;
  }>)[0];
  const reviewCount = Number(ratingRow?.review_count) || 0;
  const avg = Number(ratingRow?.avg_rating);
  const avgRating = reviewCount > 0 && Number.isFinite(avg) ? avg : null;

  const rows = ((feedbackResult.data ?? []) as FeedbackRow[]).filter(
    (row) => typeof row.id === "string" && Number(row.rating) >= 1 && Number(row.rating) <= 5,
  );

  const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    const stars = Math.round(Number(row.rating)) as 1 | 2 | 3 | 4 | 5;
    if (stars in buckets) buckets[stars] += 1;
  }
  const ratedTotal = Object.values(buckets).reduce((sum, n) => sum + n, 0);
  const distribution: PartnerFeedbackDistribution[] = ([5, 4, 3, 2, 1] as const).map((stars) => {
    const count = buckets[stars];
    return {
      stars,
      count,
      percent: ratedTotal > 0 ? Math.round((count / ratedTotal) * 100) : 0,
    };
  });

  const customerIds = Array.from(new Set(rows.slice(0, 5).map((row) => row.customer_id).filter(Boolean)));
  const profilesById = new Map<string, ProfileRow>();
  if (customerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name")
      .in("id", customerIds);
    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile);
    }
  }

  const recent: PartnerDashboardReview[] = rows.slice(0, 5).map((row) => {
    const name = personName(profilesById.get(row.customer_id), customerFallback);
    return {
      id: row.id,
      rating: Number(row.rating) || 0,
      message: (row.message ?? "").trim(),
      createdAt: row.created_at ?? "",
      customerName: name,
      customerInitial: name.trim().charAt(0).toUpperCase() || "C",
    };
  });

  return {
    avgRating,
    reviewCount,
    distribution,
    recent,
  };
}
