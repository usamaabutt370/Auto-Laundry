import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";

const c = theme.colors;

export default function CustomerChatScreen() {
  const s = strings.tabs.customer;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppHeader title={s.chat} />
      </SafeAreaView>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>chat will soon here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 12,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholderText: {
    fontSize: theme.fontSize.descText,
    color: c.gray50,
    textAlign: "center",
  },
});
