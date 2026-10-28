import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61591951860013";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.autolaundry.app&hl=en";
const APP_STORE_URL = "https://apps.apple.com/app/id6755495387";

const SOCIAL = [
  { name: "facebook" as const, url: FACEBOOK_URL, label: "Facebook" },
  { name: "instagram" as const, url: FACEBOOK_URL, label: "Instagram" },
  { name: "youtube" as const, url: FACEBOOK_URL, label: "YouTube" },
  { name: "linkedin" as const, url: FACEBOOK_URL, label: "LinkedIn" },
  { name: "whatsapp" as const, url: FACEBOOK_URL, label: "WhatsApp" },
];

type FooterLink = { label: string; anchor?: string; href?: string };

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Home", anchor: "home" },
      { label: "Services", anchor: "services" },
      { label: "Nearby Providers", anchor: "providers" },
      { label: "Recommended", anchor: "providers" },
    ],
  },
  {
    title: "For Customers",
    links: [
      { label: "Find a Provider", anchor: "providers" },
      { label: "Orders", href: "/(auth)/login" },
      { label: "Reviews", anchor: "help" },
      { label: "Help & Support", href: "/(auth)/login" },
    ],
  },
  {
    title: "For Providers",
    links: [
      { label: "Become a Partner", href: "/(auth)/welcome" },
      { label: "Partner Login", href: "/(auth)/login" },
      { label: "How it works", anchor: "become-captain" },
      { label: "Partner Help", href: "/(auth)/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", anchor: "home" },
      { label: "Contact", href: "/(auth)/login" },
      { label: "Privacy Policy", href: "/(auth)/login" },
      { label: "Terms & Conditions", href: "/(auth)/login" },
    ],
  },
];

type Props = {
  onNavigate?: (anchor: string) => void;
};

/** Dark marketplace footer matching the design mock. */
export function LandingFooter({ onNavigate }: Props) {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();
  const year = new Date().getFullYear();

  const openLink = (link: FooterLink) => {
    if (link.anchor) {
      onNavigate?.(link.anchor);
      return;
    }
    if (link.href) router.push(link.href as never);
  };

  return (
    <View style={styles.section}>
      <LandingContainer>
        <View style={[styles.top, isWebDesktop && styles.topDesktop]}>
          <View style={styles.brandCol}>
            <Image
              source={assets.icons.landing_logo_white}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.tagline}>
              Trusted local providers for laundry, ironing, and tailoring — compare, contact, and
              get it done.
            </Text>
            <View style={styles.socialRow}>
              {SOCIAL.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => void Linking.openURL(item.url)}
                  style={styles.socialBtn}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                >
                  <MaterialCommunityIcons name={item.name} size={18} color={UI.card} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.linksWrap, isWebDesktop && styles.linksWrapDesktop]}>
            {LINK_COLUMNS.map((column) => (
              <View key={column.title} style={styles.linkCol}>
                <Text style={styles.colTitle}>{column.title}</Text>
                {column.links.map((link) => (
                  <Pressable
                    key={link.label}
                    onPress={() => openLink(link)}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.link}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.downloadCol}>
            <Text style={styles.colTitle}>Download App</Text>
            <Pressable
              onPress={() => void Linking.openURL(APP_STORE_URL)}
              style={({ pressed }) => [styles.storeBtn, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Download on the App Store"
            >
              <MaterialCommunityIcons name="apple" size={22} color={UI.card} />
              <View>
                <Text style={styles.storeSmall}>Download on the</Text>
                <Text style={styles.storeBig}>App Store</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => void Linking.openURL(GOOGLE_PLAY_URL)}
              style={({ pressed }) => [styles.storeBtn, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Get it on Google Play"
            >
              <MaterialCommunityIcons name="google-play" size={20} color={UI.card} />
              <View>
                <Text style={styles.storeSmall}>Get it on</Text>
                <Text style={styles.storeBig}>Google Play</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.copyright}>© {year} Tap2Laundry. All rights reserved.</Text>
          <Text style={styles.made}>Made with ♥ in Pakistan</Text>
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: UI.purpleDeep,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
  },
  top: {
    gap: 36,
  },
  topDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 28,
  },
  brandCol: {
    maxWidth: 280,
  },
  logo: {
    height: 44,
    aspectRatio: 3,
    marginBottom: 14,
  },
  tagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  linksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 28,
  },
  linksWrapDesktop: {
    flex: 1,
    justifyContent: "center",
  },
  linkCol: {
    minWidth: 130,
    gap: 8,
  },
  colTitle: {
    color: UI.card,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  link: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    paddingVertical: 2,
  },
  downloadCol: {
    gap: 10,
    minWidth: 170,
  },
  storeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  storeSmall: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
  },
  storeBig: {
    color: UI.card,
    fontWeight: "700",
    fontSize: 14,
  },
  bottom: {
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  copyright: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  made: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
