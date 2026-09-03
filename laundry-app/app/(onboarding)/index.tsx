import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { strings } from "@/constants/strings";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";
import { assets } from "@/assets/assets";
import { GradientText } from "@/components/gradient-text";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TOTAL_SLIDES = 3;

const textColors = {
  heading: "#FFFFFF",
  body: "#FFFFFF",
  skip: "#FFFFFF",
  headingAccentBlue: "#1677FF",
  headingAccentGreen: "#7ED321",
  secondary: "#E5E7EB",
  muted: "#6B7280",
};


function SlideHeading({
  before,
  accentBlue,
  accentGreen,
}: {
  before: string;
  accentBlue: string;
  accentGreen: string;
}) {
  return (
    <View style={styles.headingWrap}>
      {/* Line 1 — plain white */}
      <Text style={[styles.heading, { color: textColors.heading }]}>
        {before}
      </Text>
      {/* Line 2 — blue → green gradient */}
      <GradientText
        colors={[textColors.headingAccentBlue, textColors.headingAccentGreen]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heading}
      >
        {`${accentBlue}${accentGreen}`}
      </GradientText>
    </View>
  );
}

function ProgressSegments({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_SLIDES }).map((_, i) =>
        i === currentIndex ? (
          <LinearGradient
            key={i}
            colors={[ textColors.headingAccentBlue, textColors.headingAccentGreen]}
            locations={[0, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressSegment}
          />
        ) : (
          <View
            key={i}
            style={[styles.progressSegment, styles.progressSegmentInactive]}
          />
        )
      )}
    </View>
  );
}

/** Slide 1 — full-bleed hero matching design */
function Slide1Intro() {
  const s = strings.onboarding.slide1;
  return (
    <View style={styles.slide}>
      <Image
        source={assets.onboarding.slide1}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.15)",
          "rgba(0,0,0,0.72)",
          "rgba(0,0,0,0.92)",
        ]}
        locations={[0.5, 0.65, 0.82, 1]}
        style={styles.gradient}
      />
      <SafeAreaView style={styles.slideSafe} edges={["bottom"]}>
        <View style={styles.copyBlock}>
          <SlideHeading
            before={s.titleBefore}
            accentBlue={s.titleAccentBlue}
            accentGreen={s.titleAccentGreen}
          />
          <Text style={styles.body}>
            <Text style={styles.bodyBase}>{s.subtitle1}</Text>
            <Text style={styles.bodyAccent}>{s.bodyAccent}</Text>
            <Text style={styles.bodyBase}>{s.bodyAfter}</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Slide 2 — same shell, existing copy until redesigned */
function Slide2Placeholder() {
  const s = strings.onboarding.slide2;
  return (
    <View style={styles.slide}>
      <Image
        source={assets.onboarding.slide2}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.15)",
          "rgba(0,0,0,0.72)",
          "rgba(0,0,0,0.92)",
        ]}
        locations={[0.5, 0.65, 0.82, 1]}
        style={styles.gradient}
      />
      <SafeAreaView style={styles.slideSafe} edges={["bottom"]}>
        <View style={styles.copyBlock}>
          <SlideHeading
            before={s.titleBefore}
            accentBlue={s.titleAccentBlue}
            accentGreen={s.titleAccentGreen}
          />
          <Text style={styles.bodyBase}>{s.subtitle1}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Last slide */
function Slide3GetStarted() {
  const s = strings.onboarding.slide3;
  return (
    <View style={styles.slide}>
      <Image
        source={assets.onboarding.slide3}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.15)",
          "rgba(0,0,0,0.72)",
          "rgba(0,0,0,0.92)",
        ]}
        locations={[0.5, 0.65, 0.82, 1]}
        style={styles.gradient}
      />
      <SafeAreaView style={styles.slideSafe} edges={["bottom"]}>
        <View style={styles.copyBlock}>
          <SlideHeading
            before={s.titleBefore}
            accentBlue={s.titleAccentBlue}
            accentGreen={s.titleAccentGreen}
          />
          <Text style={styles.bodyBase}>{s.subtitle1}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setCompleted } = useOnboardingComplete();

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleGetStarted = async () => {
    await setCompleted();
    router.replace("/(customer)");
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleNext = () => {
    const next = currentIndex + 1;
    if (next < TOTAL_SLIDES) {
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setCurrentIndex(next);
    } else {
      handleGetStarted();
    }
  };

  const s = strings.onboarding;
  const isLast = currentIndex === TOTAL_SLIDES - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        style={styles.scroll}
      >
        <Slide1Intro />
        <Slide2Placeholder />
        <Slide3GetStarted />
      </ScrollView>

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.72)",
          "rgba(0,0,0,0.45)",
          "rgba(0,0,0,0.25)",
          "transparent",
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.topChrome} edges={["top"]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <ProgressSegments currentIndex={currentIndex} />
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.skip}
            hitSlop={12}
          >
            <Text style={styles.skipText}>{s.skip}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {isLast && (
        <SafeAreaView style={styles.bottomCtaWrap} edges={["bottom"]}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.slide3.next}
          >
            <Image source={assets.icons.arrow_right_icon} style={styles.getStartedIcon} />
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  slideSafe: {
    flex: 1,
    justifyContent: "flex-end",
  },
  copyBlock: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: textColors.headingAccentBlue,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  headingWrap: {
    marginBottom: 10,
  },
  heading: {
    fontSize: 35,
    lineHeight: 40,
    fontFamily: "Poppins-Bold",
  },
  headingBase: {
    color: textColors.heading,
  },
  headingBlue: {
    color: textColors.headingAccentBlue,
  },
  headingGreen: {
    color: textColors.headingAccentGreen,
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    maxWidth: 340,
  },
  bodyBase: {
    color: textColors.body,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins-Regular",
  },
  bodyAccent: {
    color: textColors.headingAccentGreen,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins-SemiBold",
  },
  topChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.22,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 0,
    marginTop: -8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginRight: 16,
  },
  progressSegment: {
    width: 50,
    height: 5,
    borderRadius: 100,
  },
  progressSegmentInactive: {
    backgroundColor: "rgba(229, 231, 235, 0.65)",
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: textColors.skip,
    letterSpacing: 1.4,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pressed: {
    opacity: 0.75,
  },
  bottomCtaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  getStartedButton: {
    height: 56,
    width: 56,
    backgroundColor: textColors.headingAccentBlue,
    borderRadius: 100,
    alignItems: "center",
    alignSelf: "flex-end",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  getStartedText: {
    color: textColors.heading,
    fontSize: 16,
    fontWeight: "700",
  },
  getStartedIcon: {
    width: 24,
    height: 24,
    tintColor: "#FFFFFF",
  },
});
