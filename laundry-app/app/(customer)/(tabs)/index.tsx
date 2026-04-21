import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { CustomerHomeMap } from "@/components/customer-home-map";
import { ThemedText } from "@/components/themed-text";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { assets } from "@/assets/assets";
import { useSidebar } from "@/contexts/sidebar-context";
import { Platform, Pressable, StyleSheet, View } from "react-native";

const c = theme.colors;

export default function CustomerHomeScreen() {
  const router = useRouter();
  const s = strings.customer.home;
  const tabBarHeight = useBottomTabBarHeight();
  const { open: openSidebar } = useSidebar();

  return (
    <View style={styles.container}>
      <CustomerHomeMap
        strings={s}
        onMenuPress={openSidebar}
        onPartnerPress={(partnerId, mode) =>
          router.push({
            pathname: "/(customer)/launderer-detail",
            params: { id: partnerId, mode },
          })
        }
        recenterBottomOffset={Math.max(0, tabBarHeight - 18) + 180}
      />

      {/* Service selection card (bottom sheet style) */}
      <View
        style={[styles.serviceCard, { bottom: Math.max(0, tabBarHeight - 18) }]}
      >
        <ThemedText style={styles.serviceCardTitle}>
          {s.chooseService}
        </ThemedText>
        <View style={styles.serviceButtons}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(customer)/pick-launderer",
                params: { mode: "dropoff" },
              })
            }
            style={({ pressed }) => [
              styles.serviceBtn,
              pressed && styles.pressed,
            ]}
          >
            <Image
              source={assets.icons.dropoff_icon}
              style={styles.serviceBtnIcon}
            />
            <ThemedText style={styles.serviceBtnText}>{s.dropOff}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(customer)/pick-launderer",
                params: { mode: "pickupDelivery" },
              })
            }
            style={({ pressed }) => [
              styles.serviceBtn,
              pressed && styles.pressed,
            ]}
          >
            <Image
              source={assets.icons.scooter_icon}
              style={styles.serviceBtnIcon}
            />
            <ThemedText style={styles.serviceBtnText}>
              {s.pickUpDelivery}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  pressed: {
    opacity: 0.7,
  },
  serviceCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  serviceCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: c.white,
    textAlign: "center",
    marginBottom: 20,
  },
  serviceButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  serviceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Platform.OS === "android" ? 6 : 7,
    height: 56,
    borderRadius: 14,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.white,
    paddingHorizontal: Platform.OS === "android" ? 4 : 0,
  },
  serviceBtnIcon: {
    width: Platform.OS === "android" ? 22 : 28,
    height: Platform.OS === "android" ? 22 : 28,
    tintColor: c.white,
  },
  serviceBtnText: {
    fontSize: Platform.OS === "android" ? 13 : 14,
    fontWeight: "600",
    color: c.white,
    flexShrink: 1,
  },
});
