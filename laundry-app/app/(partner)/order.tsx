import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";

const c = theme.colors;
const fs = theme.fontSize;

export default function PartnerOrderScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>{strings.partner.sidebar.order}</Text>
        <Text style={styles.placeholder}>Orders list will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  backLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  pressed: { opacity: 0.8 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 12,
  },
  placeholder: {
    fontSize: fs.smallText15,
    color: c.blue500,
  },
});
