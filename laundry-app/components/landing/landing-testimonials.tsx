import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { UI } from "@/constants/theme";
import {
  fetchLandingPublicReviews,
  type LandingPublicReview,
} from "@/lib/partner-discovery";
import { LandingContainer } from "./landing-container";

/** Carousel of live customer reviews from Supabase. */
export function LandingTestimonials() {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<LandingPublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const cardWidth = Math.min(340, width - 64);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await fetchLandingPublicReviews(12);
      if (!cancelled) {
        setReviews(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollTo = (next: number) => {
    if (reviews.length === 0) return;
    const clamped = Math.max(0, Math.min(reviews.length - 1, next));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * (cardWidth + 16), animated: true });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / (cardWidth + 16)));
  };

  if (!loading && reviews.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <LandingContainer>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>What our customers say</Text>
            <Text style={styles.subheading}>Real experiences from people in your city</Text>
          </View>
          {reviews.length > 1 ? (
            <View style={styles.controls}>
              <Pressable
                onPress={() => scrollTo(index - 1)}
                style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Previous testimonial"
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={UI.text} />
              </Pressable>
              <Pressable
                onPress={() => scrollTo(index + 1)}
                style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Next testimonial"
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={UI.text} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={UI.blue} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.row}
            decelerationRate="fast"
            snapToInterval={cardWidth + 16}
          >
            {reviews.map((item) => {
              const stars = Math.max(0, Math.min(5, Math.round(item.rating)));
              return (
                <View key={item.id} style={[styles.card, { width: cardWidth }]}>
                  <View style={styles.stars}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <MaterialCommunityIcons
                        key={starIndex}
                        name={starIndex < stars ? "star" : "star-outline"}
                        size={16}
                        color={starIndex < stars ? UI.star : UI.chipBorder}
                      />
                    ))}
                  </View>
                  <Text style={styles.quote}>&ldquo;{item.message}&rdquo;</Text>
                  <View style={styles.attribution}>
                    {item.reviewerImageUrl ? (
                      <Image
                        source={{ uri: item.reviewerImageUrl }}
                        style={styles.avatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.reviewerInitial}</Text>
                      </View>
                    )}
                    <View style={styles.attributionCopy}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.reviewerName}
                      </Text>
                      <Text style={styles.detail} numberOfLines={1}>
                        {item.locationLabel} • {item.businessName}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: UI.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.text,
  },
  subheading: {
    fontSize: 15,
    color: UI.muted,
  },
  controls: {
    flexDirection: "row",
    gap: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    paddingVertical: 32,
    alignItems: "center",
  },
  row: {
    gap: 16,
    paddingRight: 8,
  },
  card: {
    borderRadius: 18,
    padding: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 12,
  },
  quote: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
    color: UI.text,
    marginBottom: 18,
    minHeight: 72,
  },
  attribution: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attributionCopy: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.chipBorder,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.card,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.text,
  },
  detail: {
    fontSize: 12,
    color: UI.muted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
