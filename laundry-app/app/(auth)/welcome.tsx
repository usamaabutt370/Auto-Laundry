import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { OnboardingColors } from "@/constants/onboarding-theme";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { Spacer } from "@/components";
import { assets } from "@/assets/assets";
import { Image } from "expo-image";

/**
 * Welcome screen (first in auth flow): Select your experience – User or Courier.
 * Shown after onboarding for new users, or first when returning users open auth.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const s = strings.auth.welcome;

  const handleSelectUser = () => {
    router.push("/(auth)/phone");
  };

  const handleSelectCourier = () => {
    router.push("/(auth)/phone");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <Spacer.Column numberOfSpaces={24} />
      <View style={styles.content}>
        <Text style={styles.title}>{s.title}</Text>
        <Spacer.Column numberOfSpaces={8} />
        <Text style={styles.subtitle}>{s.subtitle}</Text>
        <Spacer.Column numberOfSpaces={16} />
        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.cardUser,
              pressed && styles.cardPressed,
            ]}
            onPress={handleSelectUser}
            accessibilityRole="button"
            accessibilityLabel={s.user.title}
          >
            <View style={styles.cardIconWrap}>
              <Image source={assets.icons.user_icon} style={styles.cardIcon} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{s.user.title}</Text>
              <Spacer.Column numberOfSpaces={1} />
              <Text style={styles.cardDescription}>{s.user.description}</Text>
            </View>
          </Pressable>
          <Spacer.Column numberOfSpaces={6} />
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.cardCourier,
              pressed && styles.cardPressed,
            ]}
            onPress={handleSelectCourier}
            accessibilityRole="button"
            accessibilityLabel={s.courier.title}
          >
            <View style={styles.cardIconWrap}>
              <Image source={assets.icons.user_icon} style={styles.cardIcon} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{s.courier.title}</Text>
              <Spacer.Column numberOfSpaces={1} />
              <Text style={styles.cardDescription}>
                {s.courier.description}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.white,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.white,
    lineHeight: 24,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  cards: {
    backgroundColor: "transparent",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    minHeight: 100,
    backgroundColor: "transparent",
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  cardUser: {
    backgroundColor: theme.colors.blue900,
  },
  cardCourier: {
    backgroundColor: theme.colors.blue900,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.white,
    backgroundColor: "transparent",
  },
  cardDescription: {
    fontSize: 12,
    color: theme.colors.white,
    lineHeight: 20,
    backgroundColor: "transparent",
  },
});
