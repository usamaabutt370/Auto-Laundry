import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Spacer, ThemedText, ThemedView } from "@/components";
import { strings } from "@/constants/strings";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";
import { theme } from "@/constants/theme";
import { assets } from "@/assets/assets";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_SLIDES = 3;

/** Slide 1 */
function Slide1Intro() {
  const s = strings.onboarding.slide1;
  return (
    <ThemedView style={styles.slide}>

      <ThemedText style={styles.title}>{s.title}</ThemedText>
      <Spacer.Column numberOfSpaces={5} />
      <ThemedText style={styles.subtitle}>{s.subtitle1}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle2}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle3}</ThemedText>
      <Spacer.Column numberOfSpaces={15} />
      <ThemedView style={styles.imageContainer}>
        <Image source={assets.onboarding.slide1} style={styles.image} />
      </ThemedView>
    </ThemedView>
  );
}

/** Slide 2 */
function Slide2Placeholder() {
  const s = strings.onboarding.slide2;
  return (
    <ThemedView style={styles.slide}>
      <ThemedText style={styles.title}>{s.title}</ThemedText>
      <Spacer.Column numberOfSpaces={5} />
      <ThemedText style={styles.subtitle}>{s.subtitle1}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle2}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle3}</ThemedText>
      <Spacer.Column numberOfSpaces={15} />
      <ThemedView style={styles.imageContainer}>
        <Image source={assets.onboarding.slide2} style={styles.image} />
      </ThemedView>
    </ThemedView>
  );
}

/** Last slide */
function Slide3GetStarted() {
  const s = strings.onboarding.slide3;
  return (
    <ThemedView style={styles.slide}>
      <ThemedText style={styles.title}>{s.title}</ThemedText>
      <Spacer.Column numberOfSpaces={5} />
      <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle2}</ThemedText>
      <ThemedText style={styles.subtitle}>{s.subtitle3}</ThemedText>
      <Spacer.Column numberOfSpaces={15} />
      <ThemedView style={styles.imageContainer}>
        <Image source={assets.onboarding.slide3} style={styles.image} />
      </ThemedView>
    </ThemedView>
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

  const goToNextSlide = () => {
    const next = currentIndex + 1;
    if (next < TOTAL_SLIDES) {
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setCurrentIndex(next);
    }
  };

  const handleGetStarted = async () => {
    await setCompleted();
    router.replace("/(auth)");
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleNext = () => {
    if (currentIndex < TOTAL_SLIDES - 1) {
      goToNextSlide();
    } else {
      handleGetStarted();
    }
  };

  const s = strings.onboarding;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={s.skip}
        >
          <Text style={styles.skipText}>{s.skip}</Text>
        </Pressable>

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex < TOTAL_SLIDES - 1
              ? strings.onboarding.slide1.next
              : strings.onboarding.slide3.next
          }
        >
          <IconSymbol
            name="chevron.right"
            size={20}
            color={theme.colors.white}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    height: 500,
    width: '100%',
    backgroundColor: "transparent",
  },
  image: {
    width: 390,
    height: 500,
    resizeMode: "contain",
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 35,
    justifyContent: "flex-start",
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    color: theme.colors.white,
    textAlign: "center",
    backgroundColor: "transparent",
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 25,
    color: theme.colors.white,
    lineHeight: 30,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    marginBottom: 50,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    borderRadius: 100,
  },
  dotActive: {
    width: 10,
    height: 10,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.backgroundLight,
  },
  nextButton: {
    width: 45,
    height: 45,
    borderRadius: 100,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
