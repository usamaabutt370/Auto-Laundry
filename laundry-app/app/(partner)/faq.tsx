import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { AppHeader } from "@/components/app-header";

const c = theme.colors;
const fs = theme.fontSize;

export default function PartnerFaqScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={strings.partner.sidebar.faq}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>
      <View style={styles.content}>
        <Text style={styles.placeholder}>FAQs for Laundry Captains will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  pressed: { opacity: 0.8 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  placeholder: {
    fontSize: fs.smallText15,
    color: c.blue500,
  },
});
