import { AppTabsLayout, HOME_TAB_ICON_SCALE, type AppTabItem } from "@/components/bottom-tab-bar";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const partnerTabs: AppTabItem[] = [
  {
    name: "index",
    title: strings.tabs.partner.dashboard,
    icon: assets.icons.home_icon,
    iconScale: HOME_TAB_ICON_SCALE,
  },
  {
    name: "order",
    title: strings.tabs.partner.orders,
    icon: assets.icons.order_icon,
  },
  {
    name: "chat",
    title: strings.tabs.partner.chat,
    icon: assets.icons.msg_icon,
  },
  {
    name: "profile",
    title: strings.tabs.partner.profile,
    icon: assets.icons.profile_icon,
  },
];

export default function PartnerTabsLayout() {
  const { hideBottomTabBar } = useResponsiveLayout();
  return <AppTabsLayout tabs={partnerTabs} hideTabBar={hideBottomTabBar} />;
}
