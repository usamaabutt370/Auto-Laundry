import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { LanguageSelector } from "@/components/language-selector";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";
import { strings } from "@/constants/strings";

const c = theme.colors;
const fs = theme.fontSize;
const s = strings.partner;

export default function PartnerProfileScreen() {
  const router = useRouter();
  const { user, refreshRole } = useAuth();
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const handleRoleToggle = useCallback(
    async (value: boolean) => {
      if (!user?.id || !isSupabaseConfigured() || isUpdatingRole) return;
      const newRole: UserRole = value ? "launderer" : "customer";
      setIsUpdatingRole(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (error) throw error;
        await refreshRole();
        router.replace("/(customer)");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not update role.";
        Alert.alert("Error", message);
      } finally {
        setIsUpdatingRole(false);
      }
    },
    [user?.id, isUpdatingRole, refreshRole, router],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <LanguageSelector />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{strings.partner.sidebar.profile}</Text>
          <Text style={styles.subtitle}>{s.dashboardSubtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleRow}>
            <Text style={styles.roleLabel}>{s.useAppAsLaunderer}</Text>
            <Switch
              value={true}
              onValueChange={handleRoleToggle}
              disabled={isUpdatingRole}
              trackColor={{ false: c.blue900, true: c.blue500 }}
              thumbColor={c.white}
            />
          </View>
          <Text style={styles.hint}>
            Turn off to switch back to the customer dashboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  backLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.blue500,
  },
  card: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleLabel: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    flex: 1,
  },
  hint: {
    fontSize: fs.descText,
    color: c.blue500,
    marginTop: 12,
  },
});
