import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ThemedText } from "@/components/themed-text";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { assets } from "@/assets/assets";
import { useSidebar } from "@/contexts/sidebar-context";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const c = theme.colors;

export default function CustomerHomeScreen() {
  const router = useRouter();
  const s = strings.customer.home;
  const tabBarHeight = useBottomTabBarHeight();
  const { open: openSidebar } = useSidebar();

  return (
    <View style={styles.container}>
      {/* Map area (placeholder – can replace with react-native-maps later) */}
      <View style={styles.mapArea} />

      {/* Header overlay */}
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={openSidebar}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <MaterialCommunityIcons name="menu" size={24} color={c.background} />
        </Pressable>
        <View style={styles.addressInputWrap}>
          <TextInput
            placeholder={s.addressPlaceholder}
            placeholderTextColor={c.gray50}
            style={styles.addressInput}
            editable
            returnKeyType="done"
          />
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              styles.locationIconInside,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Current location"
          >
            <Image
              source={assets.icons.location_icon}
              style={styles.locationIconImage}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Service selection card (bottom sheet style) */}
      <View
        style={[styles.serviceCard, { bottom: Math.max(0, tabBarHeight - 18) }]}
      >
        <ThemedText style={styles.serviceCardTitle}>
          {s.chooseService}
        </ThemedText>
        <View style={styles.serviceButtons}>
          <Pressable
            onPress={() => {}}
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
            onPress={() => router.push("/(customer)/pickup-services")}
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
  mapArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#D1D5DB",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  iconBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  addressInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingRight: 12,
  },
  addressInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    paddingRight: 8,
    fontSize: 15,
    color: theme.colors.themeBlack,
  },
  locationIconInside: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  locationIconImage: {
    width: 24,
    height: 24,
    tintColor: c.background,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: c.background,
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
    gap: 10,
    height: 56,
    borderRadius: 14,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.white,
  },
  serviceBtnIcon: {
    width: 28,
    height: 28,
    tintColor: c.white,
  },
  serviceBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: c.white,
  },
});
