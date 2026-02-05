import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { OnboardingColors } from '@/constants/onboarding-theme';
import { strings } from '@/constants/strings';
import { useOnboardingComplete } from '@/hooks/use-onboarding-complete';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SLIDES = 3;

/** New onboarding slide 1: Welcome to Auto Laundry intro */
function Slide1Intro({ onNext }: { onNext: () => void }) {
  const s = strings.onboarding.slide1;
  return (
    <View style={styles.slide}>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.subtitle}>{s.subtitle}</Text>
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={s.next}>
        <Text style={styles.primaryButtonText}>{s.next}</Text>
      </Pressable>
    </View>
  );
}

/** Placeholder for slide 2 (you can replace with real content) */
function Slide2Placeholder() {
  return (
    <View style={styles.slide}>
      <Text style={styles.placeholderTitle}>How it works</Text>
      <Text style={styles.placeholderSub}>Slide 2 – coming next</Text>
    </View>
  );
}

/** Last slide: Get started → complete onboarding and go to auth (welcome screen) */
function Slide3GetStarted({ onGetStarted }: { onGetStarted: () => void }) {
  const s = strings.onboardingLast;
  return (
    <View style={styles.slide}>
      <Text style={styles.placeholderTitle}>You’re all set</Text>
      <Text style={styles.placeholderSub}>Choose your experience on the next screen.</Text>
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        onPress={onGetStarted}
        accessibilityRole="button"
        accessibilityLabel={s.getStarted}>
        <Text style={styles.primaryButtonText}>{s.getStarted}</Text>
      </Pressable>
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

  const goToNextSlide = () => {
    const next = currentIndex + 1;
    if (next < TOTAL_SLIDES) {
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setCurrentIndex(next);
    }
  };

  const handleGetStarted = async () => {
    await setCompleted();
    router.replace('/(auth)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        style={styles.scroll}>
        <Slide1Intro onNext={goToNextSlide} />
        <Slide2Placeholder />
        <Slide3GetStarted onGetStarted={handleGetStarted} />
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: OnboardingColors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: OnboardingColors.textSecondary,
    lineHeight: 24,
    marginBottom: 40,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: OnboardingColors.dotActive,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: OnboardingColors.textPrimary,
  },
  placeholderSub: {
    fontSize: 16,
    color: OnboardingColors.textSecondary,
    marginTop: 8,
    marginBottom: 40,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: OnboardingColors.dotActive,
    width: 24,
  },
  dotInactive: {
    backgroundColor: OnboardingColors.dotInactive,
  },
});
