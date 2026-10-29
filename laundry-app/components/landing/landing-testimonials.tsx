import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { LandingTestimonialCard } from "./landing-testimonial-card";

const SECTION_PAD = 24;
const CARD_GAP = 16;
/** Visible strip of the following card on mobile / narrow viewports. */
const NEXT_CARD_PEEK = 52;
const DESKTOP_CARD_MAX = 340;

/** Carousel of live customer reviews from Supabase. */
export function LandingTestimonials() {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<LandingPublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  // One leading card + peek of the next — never fill the full content width.
  const contentWidth = Math.max(0, width - SECTION_PAD * 2);
  const cardWidth =
    contentWidth > 700
      ? DESKTOP_CARD_MAX
      : Math.min(DESKTOP_CARD_MAX, Math.max(240, contentWidth - NEXT_CARD_PEEK));
  const snapInterval = cardWidth + CARD_GAP;

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
    scrollRef.current?.scrollTo({ x: clamped * snapInterval, animated: true });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / snapInterval));
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
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
          >
            {reviews.map((item, reviewIndex) => (
              <LandingTestimonialCard
                key={item.id}
                item={item}
                width={cardWidth}
                accent={reviewIndex % 2 === 0 ? "orange" : "blue"}
              />
            ))}
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
    gap: CARD_GAP,
    // Extra end pad so the last card can sit with the same peek gutter.
    paddingRight: NEXT_CARD_PEEK,
    overflow: "visible",
  },
  pressed: {
    opacity: 0.8,
  },
});
