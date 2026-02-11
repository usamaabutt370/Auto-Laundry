import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { strings } from "@/constants/strings";

export default function CustomerOrderScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <ThemedText type="title">{strings.tabs.customer.order}</ThemedText>
        <ThemedText style={styles.subtitle}>
          Your orders will appear here.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
});
