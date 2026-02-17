import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";
import { strings } from "@/constants/strings";

const c = theme.colors;
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{strings.tabs.partner.profile}</Text>
          <Text style={styles.subtitle}>{s.dashboardSubtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleRow}>
            <Text style={styles.roleLabel}>{s.useAppAsLaunderer}</Text>
            <Switch
              value={true}
              onValueChange={(value) => handleRoleToggle(value)}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: c.blue500,
    marginTop: 12,
  },
});
