import { useRef } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { theme } from "@/constants/theme";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingVision } from "./landing-vision";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingServices } from "./landing-services";
import { LandingWhyChooseUs } from "./landing-why-choose-us";
import { LandingBecomeCaptain } from "./landing-become-captain";
import { LandingGallery } from "./landing-gallery";
import { LandingTestimonials } from "./landing-testimonials";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

/** Marketing landing page shown to signed-out visitors on web. */
export function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

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
      <LandingHeader onNavigate={handleNavigate} />
      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <LandingHero />
        <LandingVision />
        <View onLayout={registerSection("how-it-works")}>
          <LandingHowItWorks />
        </View>
        <View onLayout={registerSection("services")}>
          <LandingServices />
        </View>
        <View onLayout={registerSection("why-choose-us")}>
          <LandingWhyChooseUs />
        </View>
        <View onLayout={registerSection("become-captain")}>
          <LandingBecomeCaptain />
        </View>
        <LandingGallery />
        <LandingTestimonials />
        <LandingCta />
        <LandingFooter />
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
