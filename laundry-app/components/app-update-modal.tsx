import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UI } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import type { AppUpdatePrompt } from "@/lib/app-update";
import { getStrings } from "@/locales";

type Props = {
  prompt: AppUpdatePrompt | null;
  onUpdate: () => void;
  onLater: () => void;
};

const NAVY = "#1B2559";

function SparklePlusIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Path
        d="M14 3.2c.35 4.1 1.35 6.6 4.1 8.7 2.7 2.1 5.4 2.9 9.4 3.3-4 .4-6.7 1.2-9.4 3.3-2.75 2.1-3.75 4.6-4.1 8.7-.35-4.1-1.35-6.6-4.1-8.7-2.7-2.1-5.4-2.9-9.4-3.3 4-.4 6.7-1.2 9.4-3.3 2.75-2.1 3.75-4.6 4.1-8.7Z"
        fill="#16A34A"
      />
      <Path
        d="M26.2 4.2v5.2M23.6 6.8h5.2"
        stroke="#16A34A"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BoltOutlineIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Path
        d="M16.2 3.2 8.4 16.2h5.1L12.2 26.8 22.4 13.2h-5.2l-1-10Z"
        fill="none"
        stroke="#7C3AED"
        strokeWidth={2.15}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function GridOutlineIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Rect x="3.2" y="3.2" width="9.2" height="9.2" rx="2.4" fill="none" stroke="#F59E0B" strokeWidth={2.15} />
      <Rect x="17.6" y="3.2" width="9.2" height="9.2" rx="2.4" fill="none" stroke="#F59E0B" strokeWidth={2.15} />
      <Rect x="3.2" y="17.6" width="9.2" height="9.2" rx="2.4" fill="none" stroke="#F59E0B" strokeWidth={2.15} />
      <Rect x="17.6" y="17.6" width="9.2" height="9.2" rx="2.4" fill="none" stroke="#F59E0B" strokeWidth={2.15} />
    </Svg>
  );
}

function PhoneHero() {
  return (
    <Image
      source={require("@/assets/images/app-update-hero.png")}
      style={styles.heroArt}
      contentFit="contain"
      accessibilityLabel="Tap2Laundry new version"
    />
  );
}

export function AppUpdateModal({ prompt, onUpdate, onLater }: Props) {
  const { locale } = useLocale();
  const copy = getStrings(locale).common.appUpdate;
  const insets = useSafeAreaInsets();
  const visible = prompt != null;
  const isForce = prompt?.kind === "force";

  const title = prompt?.config.title?.trim() || copy.title;
  const subtitle = copy.subtitle;
  const message = prompt?.config.message?.trim() || copy.message;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isForce ? undefined : onLater}
    >
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <PhoneHero />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: "#E7F8EF" }]}>
                <SparklePlusIcon />
              </View>
              <Text style={styles.featureLabel}>{copy.betterExperience}</Text>
            </View>
            <View style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: "#F3EEFF" }]}>
                <BoltOutlineIcon />
              </View>
              <Text style={styles.featureLabel}>{copy.fasterReliable}</Text>
            </View>
            <View style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: "#FFF4E8" }]}>
                <GridOutlineIcon />
              </View>
              <Text style={styles.featureLabel}>{copy.newFeatures}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onUpdate}
            style={({ pressed }) => [styles.updateWrap, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={copy.updateNow}
          >
            <LinearGradient
              colors={["#38BDF8", "#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.updateBtn}
            >
              <Text style={styles.updateText}>{copy.updateNow}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          {!isForce ? (
            <Pressable
              onPress={onLater}
              style={({ pressed }) => [styles.laterBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={copy.later}
            >
              <Text style={styles.laterText}>{copy.later}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F9FF",
  },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(147, 197, 253, 0.28)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -40,
    left: -70,
    width: 240,
    height: 160,
    borderRadius: 120,
    backgroundColor: "rgba(196, 181, 253, 0.22)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  heroArt: {
    width: "100%",
    height: 320,
    marginTop: 4,
    marginBottom: 4,
  },
  title: {
    marginTop: 4,
    fontFamily: "Poppins-Bold",
    fontSize: 32,
    lineHeight: 38,
    color: NAVY,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
  },
  features: {
    marginTop: 22,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  feature: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    lineHeight: 16,
    color: NAVY,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  updateWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  updateBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  updateText: {
    fontFamily: "Poppins-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  laterBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  laterText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: UI.muted,
  },
  pressed: { opacity: 0.88 },
});
