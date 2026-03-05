import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

const SERVICE_KEYS = ["washAndFold", "dryCleaning", "tailoring"] as const;
type ServiceKey = (typeof SERVICE_KEYS)[number];

function getServiceLabel(
  s: ReturnType<typeof getStrings>["partner"]["settings"],
  key: ServiceKey,
): string {
  switch (key) {
    case "washAndFold":
      return s.categoryWashAndFold;
    case "dryCleaning":
      return s.categoryDryCleaning;
    case "tailoring":
      return s.categoryTailoring;
    default:
      return key;
  }
}

export default function PartnerOnboardingStep2() {
  const router = useRouter();
  const { locale } = useLocale();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;

  const handleServicePress = (key: ServiceKey) => {
    if (key === "washAndFold") {
      router.push({
        pathname: "/(partner)/onboarding/step3",
        params: { service: key },
      });
    } else {
      router.push({
        pathname: "/(partner)/onboarding/service-other",
        params: { service: key },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={onboardingStrings.step2Title}
        subtitle={onboardingStrings.step2Subtitle}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
        rightIcon="tune-variant"
        onRightPress={() => {}}
        leftAccessibilityLabel={onboardingStrings.back}
        rightAccessibilityLabel="Settings"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>{onboardingStrings.chooseServicesHeading}</Text>

        {SERVICE_KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => handleServicePress(key)}
            style={({ pressed }) => [
              styles.serviceCard,
              styles.serviceCardUnselected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={getServiceLabel(settingsStrings, key)}
          >
            <Text style={styles.serviceLabel}>
              {getServiceLabel(settingsStrings, key)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={c.white}
            />
          </Pressable>
        ))}

        <AppButton
          label={onboardingStrings.finish}
          onPress={() => router.replace("/(partner)")}
          variant="filled"
          rightIcon="arrow-right"
          fullWidth
          style={styles.finishBtn}
          accessibilityLabel={onboardingStrings.finish}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pressed: {
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginBottom: 12,
    borderWidth: 1,
  },
  serviceCardUnselected: {
    backgroundColor: c.blue900,
    borderColor: c.outline,
  },
  serviceLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
    flex: 1,
  },
  finishBtn: {
    marginTop: 28,
  },
});
