import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { StarRating } from "@/components/star-rating";
import { UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchPartnerDashboardFeedback,
  type PartnerDashboardFeedback,
  type PartnerDashboardReview,
} from "@/lib/partner-dashboard-feedback";
import { getStrings } from "@/locales";

function formatAgo(
  iso: string,
  copy: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string },
): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return copy.justNow;
  if (mins < 60) return copy.minutesAgo.replace("{{count}}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return copy.hoursAgo.replace("{{count}}", String(hours));
  return copy.daysAgo.replace("{{count}}", String(Math.floor(hours / 24)));
}

function ReviewRow({
  review,
  ago,
}: {
  review: PartnerDashboardReview;
  ago: string;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{review.customerInitial}</Text>
        </View>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewName} numberOfLines={1}>
            {review.customerName}
          </Text>
          <View style={styles.starsRow}>
            <StarRating value={review.rating} size={14} />
            {ago ? <Text style={styles.ago}>{ago}</Text> : null}
          </View>
        </View>
      </View>
      {review.message ? <Text style={styles.message}>“{review.message}”</Text> : null}
    </View>
  );
}

export default function PartnerCustomerFeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getStrings(locale).partner.dashboard.home;
  const [feedback, setFeedback] = useState<PartnerDashboardFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setFeedback(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const next = await fetchPartnerDashboardFeedback(user.id, copy.customerFallback);
      setFeedback(next);
    } catch {
      setFeedback(null);
    } finally {
      setIsLoading(false);
    }
  }, [copy.customerFallback, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const reviews = feedback?.reviews ?? [];
  const reviewCount = feedback?.reviewCount ?? reviews.length;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <AppHeader
          appearance="light"
          compact
          title={copy.customerFeedback}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={copy.customerFeedback}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? <Text style={styles.stateText}>{copy.loading}</Text> : null}

        {!isLoading && reviewCount === 0 ? (
          <Text style={styles.stateText}>{copy.noReviewsYet}</Text>
        ) : null}

        {!isLoading && feedback && reviewCount > 0 ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.scoreCol}>
                <View style={styles.scoreRow}>
                  <Text style={styles.score}>{(feedback.avgRating ?? 0).toFixed(1)}</Text>
                  <MaterialCommunityIcons name="star" size={28} color="#F5B301" />
                </View>
                <Text style={styles.scoreMeta}>
                  {reviewCount === 1
                    ? copy.basedOnReviewsOne
                    : copy.basedOnReviews.replace("{{count}}", String(reviewCount))}
                </Text>
              </View>
              <View style={styles.bars}>
                {feedback.distribution.map((row) => (
                  <View key={row.stars} style={styles.barRow}>
                    <Text style={styles.barLabel}>{row.stars}</Text>
                    <MaterialCommunityIcons name="star" size={12} color="#F5B301" />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, row.percent))}%` }]} />
                    </View>
                    <Text style={styles.barPercent}>{row.percent}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {reviews.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                ago={formatAgo(review.createdAt, copy)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FB" },
  safe: { backgroundColor: "#F4F7FB" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  stateText: { color: UI.muted, fontSize: 14, textAlign: "center", paddingVertical: 28 },
  summaryCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  scoreCol: { width: 96, gap: 4 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  score: { fontSize: 36, fontWeight: "800", color: "#1E3A8A", lineHeight: 40 },
  scoreMeta: { fontSize: 11, color: UI.muted, lineHeight: 15 },
  bars: { flex: 1, gap: 6, minWidth: 0 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  barLabel: { width: 10, fontSize: 11, fontWeight: "700", color: UI.text, textAlign: "right" },
  barTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "#E8EEF5", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, backgroundColor: "#2563EB" },
  barPercent: { width: 32, fontSize: 11, color: UI.muted, fontWeight: "600", textAlign: "right" },
  reviewCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#1E3A8A" },
  reviewMeta: { flex: 1, minWidth: 0, gap: 2 },
  reviewName: { fontSize: 14, fontWeight: "700", color: "#1E3A8A" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ago: { fontSize: 11, color: UI.muted, fontWeight: "500" },
  message: { fontSize: 13, color: UI.muted, lineHeight: 19 },
});
