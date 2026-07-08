import { useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { theme } from "@/constants/theme";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingServices } from "./landing-services";
import { LandingBecomeCaptain } from "./landing-become-captain";
import { LandingCta } from "./landing-cta";

/** Marketing landing page shown to signed-out visitors on web. */
export function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [scrolled, setScrolled] = useState(false);
  const heroHeight = useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrolled(y >= heroHeight.current);
  };

  const registerSection = (anchor: string) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[anchor] = e.nativeEvent.layout.y;
  };

  const handleNavigate = (anchor: string) => {
    const y = sectionOffsets.current[anchor];
    if (y != null) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <LandingHeader onNavigate={handleNavigate} scrolled={scrolled} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View onLayout={(e) => { heroHeight.current = e.nativeEvent.layout.height; }}>
          <LandingHero />
        </View>
        <View onLayout={registerSection("how-it-works")}>
          <LandingHowItWorks />
        </View>
        <View onLayout={registerSection("services")}>
          <LandingServices />
        </View>
        <View onLayout={registerSection("become-captain")}>
          <LandingBecomeCaptain />
        </View>
        <LandingCta />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.themeWhite,
  },
  scroll: {
    flex: 1,
  },
});
