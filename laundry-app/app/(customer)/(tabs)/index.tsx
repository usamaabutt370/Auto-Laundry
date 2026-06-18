import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import { CustomerHomeMap } from "@/components/customer-home-map";
import { ThemedText } from "@/components/themed-text";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { assets } from "@/assets/assets";
import { useSidebar } from "@/contexts/sidebar-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const c = theme.colors;

export default function CustomerHomeScreen() {
  const router = useRouter();
  const s = strings.customer.home;
  const insets = useSafeAreaInsets();
  const { hideBottomTabBar, isWebDesktop } = useResponsiveLayout();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8), hideBottomTabBar);
  const showWebTopNav = isWebDesktop;
  const { open: openSidebar } = useSidebar();

  const goToPickLaunderer = (mode: "dropoff" | "pickupDelivery") => {
    router.push({
      pathname: "/(customer)/pick-launderer",
      params: { mode },
    });
  };

  const serviceButtons = (
    <>
      <Pressable
        onPress={() => goToPickLaunderer("dropoff")}
        style={({ pressed }) => [
          showWebTopNav ? styles.webServiceBtn : styles.serviceBtn,
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={assets.icons.dropoff_icon}
          style={showWebTopNav ? styles.webServiceBtnIcon : styles.serviceBtnIcon}
        />
        <ThemedText style={showWebTopNav ? styles.webServiceBtnText : styles.serviceBtnText}>
          {s.dropOff}
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => goToPickLaunderer("pickupDelivery")}
        style={({ pressed }) => [
          showWebTopNav ? styles.webServiceBtn : styles.serviceBtn,
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={assets.icons.scooter_icon}
          style={showWebTopNav ? styles.webServiceBtnIcon : styles.serviceBtnIcon}
        />
        <ThemedText style={showWebTopNav ? styles.webServiceBtnText : styles.serviceBtnText}>
          {s.pickUpDelivery}
        </ThemedText>
      </Pressable>
    </>
  );

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
        recenterBottomOffset={showWebTopNav ? Math.max(insets.bottom, 24) : tabBarInset + 162}
      />

      {showWebTopNav ? (
        <View
          style={[styles.webTopNav, { paddingTop: insets.top + 16 }]}
          pointerEvents="box-none"
        >
          <View style={styles.webTopNavButtons}>{serviceButtons}</View>
        </View>
      ) : (
        <View
          style={[
            styles.serviceCard,
            { bottom: tabBarInset, paddingBottom: 24 },
          ]}
        >
          <ThemedText style={styles.serviceCardTitle}>{s.chooseService}</ThemedText>
          <View style={[styles.serviceButtons, styles.serviceButtonsWithMargin]}>
            {serviceButtons}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pressed: {
    opacity: 0.7,
  },
  serviceCard: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: c.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    minHeight: 160,
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
  },
  serviceButtonsWithMargin: {
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
  webTopNav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
    zIndex: 100,
  },
  webTopNavButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  webServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.lightBlue,
  },
  webServiceBtnIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  webServiceBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: c.white,
  },
});
