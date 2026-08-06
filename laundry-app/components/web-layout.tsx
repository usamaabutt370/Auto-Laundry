import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { usePathname, useRouter, useSegments } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { showAppAlert } from "@/components/app-alert";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  shouldUseFullWidthWebContent,
  useResponsiveLayout,
  WEB_CONSTRAINED_CONTENT_WIDTH_RATIO,
} from "@/hooks/use-responsive-layout";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";

const c = theme.colors;
const SIDEBAR_WIDTH = 240;

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type WebNavItem = {
  id: string;
  label: string;
  href: Href;
  icon: IconName;
  /** Path segment used to mark this item active (e.g. "order", "chat"). */
  segment: string;
};

type SidebarProps = {
  brandLabel?: string;
  items: WebNavItem[];
  footerItems?: WebNavItem[];
};

type ShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

type PanelProps = {
  children: ReactNode;
};

type Area = "customer" | "partner";

type AreaShellProps = {
  area: Area;
  children: ReactNode;
};

function isItemActive(pathname: string, item: WebNavItem): boolean {
  const seg = item.segment;

  if (seg === "home") {
    return (
      pathname === "/" ||
      pathname.endsWith("/(tabs)") ||
      pathname.endsWith("/(tabs)/index") ||
      /\/\(tabs\)\/?$/.test(pathname)
    );
  }

  if (seg === "settings") {
    return pathname.includes("/settings");
  }

  if (seg === "order") {
    return /\/order$/.test(pathname) || pathname.endsWith("/(tabs)/order");
  }

  if (seg === "chat") {
    return pathname.includes("/chat");
  }

  if (seg === "profile") {
    return /\/profile$/.test(pathname) || pathname.endsWith("/(tabs)/profile");
  }

  return false;
}

/** Centers children at {@link WEB_CONSTRAINED_CONTENT_WIDTH_RATIO} on desktop web. */
export function WebCenteredPanel({ children }: PanelProps) {
  const { isWebDesktop } = useResponsiveLayout();

  if (!isWebDesktop) {
    return <View style={panelStyles.fill}>{children}</View>;
  }

  const widthPercent = `${WEB_CONSTRAINED_CONTENT_WIDTH_RATIO * 100}%`;

  return (
    <View style={panelStyles.outer}>
      <View style={[panelStyles.inner, { width: widthPercent, maxWidth: widthPercent }]}>
        {children}
      </View>
    </View>
  );
}

/**
 * On desktop web, constrains most screens to half the main panel width and centers them.
 * Dashboard (customer + partner) and pick-launderer stay full width.
 */
export function WebConstrainedMain({ children }: PanelProps) {
  const pathname = usePathname();
  const segments = useSegments();
  const { isWebDesktop } = useResponsiveLayout();

  const fullWidth = shouldUseFullWidthWebContent(pathname, segments);

  if (!isWebDesktop || fullWidth) {
    return <View style={panelStyles.fill}>{children}</View>;
  }

  return <WebCenteredPanel>{children}</WebCenteredPanel>;
}

export function WebSidebarNav({ brandLabel = "Tap2Laundry", items, footerItems = [] }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { signOut, role } = useAuth();

  const goHome = () => {
    router.push(role === "launderer" ? "/(partner)/(tabs)" : "/(customer)/(tabs)");
  };

  const handleSignOut = () => {
    showAppAlert(strings.sidebar.signOut, "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: strings.sidebar.signOut,
        style: "destructive",
        onPress: async () => {
          await signOut();
          runAfterModalTeardown(() => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace("/(customer)");
          });
        },
      },
    ]);
  };

  const renderItem = (item: WebNavItem) => {
    const active = isItemActive(pathname, item);
    return (
      <Pressable
        key={item.id}
        onPress={() => router.push(item.href)}
        style={({ pressed }) => [
          styles.navItem,
          active && styles.navItemActive,
          pressed && styles.pressed,
        ]}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={22}
          color={active ? c.white : "rgba(255, 255, 255, 0.88)"}
        />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.sidebar,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Pressable
        onPress={goHome}
        style={({ pressed }) => [styles.brandRow, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={`${brandLabel} home`}
      >
        <Image
          source={assets.icons.app_icon}
          style={styles.brandLogo}
          contentFit="contain"
          accessibilityLabel="Tap2Laundry logo"
        />
        <Text style={styles.brandText}>{brandLabel}</Text>
      </Pressable>

      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {items.map(renderItem)}
      </ScrollView>

      <View style={styles.sidebarFooter}>
        {footerItems.map(renderItem)}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="logout" size={22} color="rgba(255, 255, 255, 0.88)" />
          <Text style={styles.navLabel}>{strings.sidebar.signOut}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const WEB_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

/** Row layout: fixed sidebar + flexible main content (desktop web only). */
export function WebTabsShell({ sidebar, children }: ShellProps) {
  return (
    <View style={styles.shell}>
      {sidebar}
      <View style={styles.main}>
        <WebConstrainedMain>{children}</WebConstrainedMain>
      </View>
    </View>
  );
}

/** Customer/partner stack wrapper with sidebar on desktop web. */
export function WebAreaShell({ area, children }: AreaShellProps) {
  const { hideBottomTabBar } = useResponsiveLayout();

  if (!hideBottomTabBar) {
    return <>{children}</>;
  }

  const isCustomer = area === "customer";

  return (
    <WebTabsShell
      sidebar={
        <WebSidebarNav
          items={isCustomer ? CUSTOMER_WEB_NAV : PARTNER_WEB_NAV}
          footerItems={isCustomer ? CUSTOMER_WEB_NAV_FOOTER : PARTNER_WEB_NAV_FOOTER}
        />
      }
    >
      {children}
    </WebTabsShell>
  );
}

export const CUSTOMER_WEB_NAV: WebNavItem[] = [
  {
    id: "home",
    label: strings.tabs.customer.home,
    href: "/(customer)/(tabs)",
    icon: "view-dashboard-outline",
    segment: "home",
  },
  {
    id: "order",
    label: strings.tabs.customer.order,
    href: "/(customer)/(tabs)/order",
    icon: "clipboard-list-outline",
    segment: "order",
  },
  {
    id: "chat",
    label: strings.tabs.customer.chat,
    href: "/(customer)/(tabs)/chat",
    icon: "message-outline",
    segment: "chat",
  },
  {
    id: "profile",
    label: strings.tabs.customer.profile,
    href: "/(customer)/(tabs)/profile",
    icon: "account-outline",
    segment: "profile",
  },
];

export const CUSTOMER_WEB_NAV_FOOTER: WebNavItem[] = [
  {
    id: "settings",
    label: strings.sidebar.settings,
    href: "/(customer)/settings",
    icon: "cog-outline",
    segment: "settings",
  },
];

export const PARTNER_WEB_NAV: WebNavItem[] = [
  {
    id: "home",
    label: strings.tabs.partner.dashboard,
    href: "/(partner)/(tabs)",
    icon: "view-dashboard-outline",
    segment: "home",
  },
  {
    id: "order",
    label: strings.tabs.partner.orders,
    href: "/(partner)/(tabs)/order",
    icon: "clipboard-list-outline",
    segment: "order",
  },
  {
    id: "chat",
    label: strings.tabs.partner.chat,
    href: "/(partner)/(tabs)/chat",
    icon: "message-outline",
    segment: "chat",
  },
  {
    id: "profile",
    label: strings.tabs.partner.profile,
    href: "/(partner)/(tabs)/profile",
    icon: "account-outline",
    segment: "profile",
  },
];

export const PARTNER_WEB_NAV_FOOTER: WebNavItem[] = [
  {
    id: "settings",
    label: strings.sidebar.settings,
    href: "/(partner)/settings",
    icon: "cog-outline",
    segment: "settings",
  },
];

const panelStyles = StyleSheet.create({
  fill: {
    flex: 1,
    minWidth: 0,
  },
  outer: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    backgroundColor: c.background,
  },
  inner: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.background,
    overflow: "hidden",
  },
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.background,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: c.blue900,
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.12)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandText: {
    color: c.white,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sidebarFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: c.selectionWash,
  },
  navLabel: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 15,
    fontWeight: "500",
  },
  navLabelActive: {
    color: c.white,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});
