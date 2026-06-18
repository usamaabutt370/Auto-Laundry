import { AppTabsLayout, HOME_TAB_ICON_SCALE, type AppTabItem } from "@/components/bottom-tab-bar";
import { strings } from "@/constants/strings";
import { assets } from "@/assets/assets";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const customerTabs: AppTabItem[] = [
  {
    name: "index",
    title: strings.tabs.customer.home,
    icon: assets.icons.home_icon,
    iconScale: HOME_TAB_ICON_SCALE,
  },
  {
    name: "order",
    title: strings.tabs.customer.order,
    icon: assets.icons.order_icon,
  },
  {
    name: "chat",
    title: strings.tabs.customer.chat,
    icon: assets.icons.msg_icon,
  },
  {
    name: "profile",
    title: strings.tabs.customer.profile,
    icon: assets.icons.profile_icon,
  },
];

export default function CustomerTabsLayout() {
  const { hideBottomTabBar } = useResponsiveLayout();
  return <AppTabsLayout tabs={customerTabs} hideTabBar={hideBottomTabBar} />;
}
