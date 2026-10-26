import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { AppCtaButton } from "@/components/ui/cta-button";
import { OrderCelebration } from "@/components/ui/order-celebration";
import { UI } from "@/constants/theme";

const MAX_MESSAGE = 500;

export type OrderReviewStrings = {
  title: string;
  subtitle: string;
  tapToRate: string;
  ratingLabels: readonly [string, string, string, string, string];
  reviewsCount: string;
  noReviews: string;
  tellUsMore: string;
  placeholder: string;
  submit: string;
  submitErrorTitle: string;
  submitErrorMessage: string;
  successTitle: string;
  successThanks: string;
  successMessage: string;
  done: string;
  close: string;
};

export type OrderReviewPartner = {
  partnerName: string;
  partnerVerified: boolean;
  partnerImageUrl: string | null;
  partnerAddress: string | null;
  partnerRatingAvg: number | null;
  partnerRatingCount: number;
};

type Props = {
  partner: OrderReviewPartner;
  strings: OrderReviewStrings;
  onSubmit: (input: { rating: number; message: string }) => Promise<void>;
  /** Closed without submitting. */
  onDismiss: () => void;
  /** Closed from the success step. */
  onDone: () => void;
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Star({ filled, onPress, label }: { filled: boolean; onPress: () => void; label: string }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(
          withTiming(1.25, { duration: 110 }),
          withSpring(1, { damping: 8, stiffness: 220 }),
        );
        onPress();
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: filled }}
    >
      <Animated.View style={animStyle}>
        <MaterialCommunityIcons name="star" size={46} color={filled ? UI.star : "#E5E7EB"} />
      </Animated.View>
    </Pressable>
  );
}

function SuccessIllustration() {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    checkScale.value = withSequence(
      withTiming(0, { duration: 220 }),
      withTiming(1.15, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 9, stiffness: 180 }),
    );
  }, [checkScale, opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <Animated.View style={[styles.illoCard, cardStyle]}>
      <MaterialCommunityIcons name="star" size={44} color={UI.star} />
      <View style={styles.illoLines}>
        <View style={[styles.illoLine, { width: "100%" }]} />
        <View style={[styles.illoLine, { width: "100%" }]} />
        <View style={[styles.illoLine, { width: "86%" }]} />
        <View style={[styles.illoLine, { width: "56%" }]} />
      </View>
      <Animated.View style={[styles.illoCheck, checkStyle]}>
        <MaterialCommunityIcons name="check" size={30} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
}

export function OrderReviewSheet({ partner, strings: s, onSubmit, onDismiss, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.9);
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<"form" | "success">("form");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = step === "success" ? onDone : onDismiss;

  const pickRating = (value: number) => {
    setRating(value);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const submit = async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ rating, message: message.trim() });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setStep("success");
    } catch (e) {
      showAppAlert(s.submitErrorTitle, e instanceof Error ? e.message : s.submitErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabel =
    partner.partnerRatingAvg != null && partner.partnerRatingCount > 0
      ? `${formatRating(partner.partnerRatingAvg)} (${fill(s.reviewsCount, {
          count: partner.partnerRatingCount,
        })})`
      : s.noReviews;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.dismiss}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={s.close}
        />
        <Animated.View
          entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={[styles.sheet, { height: sheetHeight }]}
        >
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <View style={styles.headerRow}>
              <View style={styles.roundBtnSpacer} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {step === "form" ? s.title : ""}
              </Text>
              <Pressable
                onPress={close}
                hitSlop={10}
                style={styles.roundBtn}
                accessibilityRole="button"
                accessibilityLabel={s.close}
              >
                <MaterialCommunityIcons name="close" size={20} color={UI.text} />
              </Pressable>
            </View>

            {step === "form" ? (
              <>
                <ScrollView
                  ref={scrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.subtitle}>
                    {fill(s.subtitle, { name: partner.partnerName })}
                  </Text>

                  <View style={styles.partnerCard}>
                    {partner.partnerImageUrl ? (
                      <Image
                        source={{ uri: partner.partnerImageUrl }}
                        style={styles.partnerImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.partnerImage, styles.partnerImageFallback]}>
                        <MaterialCommunityIcons
                          name="storefront-outline"
                          size={30}
                          color={UI.purple}
                        />
                      </View>
                    )}
                    <View style={styles.partnerCopy}>
                      <PartnerNameWithBadge
                        name={partner.partnerName}
                        verified={partner.partnerVerified}
                        nameStyle={styles.partnerName}
                        badgeSize={16}
                      />
                      {partner.partnerAddress ? (
                        <Text style={styles.muted} numberOfLines={1}>
                          {partner.partnerAddress}
                        </Text>
                      ) : null}
                      <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={16} color={UI.star} />
                        <Text style={styles.ratingText}>{ratingLabel}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        filled={value <= rating}
                        onPress={() => pickRating(value)}
                        label={s.ratingLabels[value - 1]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.ratingWord, rating === 0 && styles.ratingWordIdle]}>
                    {rating > 0 ? s.ratingLabels[rating - 1] : s.tapToRate}
                  </Text>

                  <Text style={styles.inputLabel}>{s.tellUsMore}</Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder={s.placeholder}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={MAX_MESSAGE}
                    textAlignVertical="top"
                    style={styles.input}
                    onFocus={() => {
                      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
                    }}
                  />
                  <Text style={styles.counter}>
                    {message.length}/{MAX_MESSAGE}
                  </Text>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <AppCtaButton
                    label={s.submit}
                    onPress={submit}
                    loading={submitting}
                    disabled={rating < 1}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.successBody}>
                  <View style={styles.celebrationHost}>
                    <OrderCelebration />
                    <SuccessIllustration />
                  </View>
                  <Text style={styles.successTitle}>{s.successTitle}</Text>
                  <Text style={styles.successThanks}>{s.successThanks}</Text>
                  <Text style={styles.successMessage}>{s.successMessage}</Text>
                </View>
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <AppCtaButton label={s.done} onPress={onDone} />
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
    textAlign: "center",
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnSpacer: { width: 40, height: 40 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  partnerCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  partnerImage: { width: 76, height: 76, borderRadius: 12, backgroundColor: UI.iconWell },
  partnerImageFallback: {
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerCopy: { flex: 1, minWidth: 0, gap: 3 },
  partnerName: { fontSize: 17, fontFamily: "Poppins-Bold", color: UI.purpleDeep },
  muted: { fontSize: 13, fontFamily: "Poppins-Regular", color: UI.muted },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontFamily: "Poppins-Medium", color: UI.text },
  starsRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  ratingWord: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
    textAlign: "center",
  },
  ratingWordIdle: { fontSize: 14, fontFamily: "Poppins-Medium", color: UI.muted },
  inputLabel: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: UI.purpleDeep,
  },
  input: {
    minHeight: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
    color: UI.text,
  },
  counter: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  successBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  celebrationHost: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  illoCard: {
    width: 150,
    height: 190,
    borderRadius: 20,
    backgroundColor: UI.card,
    alignItems: "center",
    paddingTop: 26,
    paddingHorizontal: 24,
    gap: 18,
    shadowColor: UI.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  illoLines: { width: "100%", gap: 10 },
  illoLine: { height: 7, borderRadius: 4, backgroundColor: "#E5E7EB" },
  illoCheck: {
    position: "absolute",
    right: -30,
    top: 62,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: UI.card,
  },
  successTitle: {
    marginTop: 12,
    fontSize: 26,
    lineHeight: 34,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
    textAlign: "center",
  },
  successThanks: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins-Medium",
    color: UI.text,
    textAlign: "center",
  },
  successMessage: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
});
