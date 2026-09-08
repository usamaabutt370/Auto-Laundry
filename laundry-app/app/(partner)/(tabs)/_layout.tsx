import { AppTabsLayout, type AppTabItem } from "@/components/bottom-tab-bar";
import { strings } from "@/constants/strings";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const partnerTabs: AppTabItem[] = [
  {
    name: "index",
    title: strings.tabs.partner.dashboard,
    icon: "home-outline",
    focusedIcon: "home",
  },
  {
    name: "order",
    title: strings.tabs.partner.orders,
    icon: "clipboard-text-outline",
    focusedIcon: "clipboard-text",
  },
  {
    name: "chat",
    title: strings.tabs.partner.chat,
    icon: "chat-outline",
    focusedIcon: "chat",
  },
  {
    name: "profile",
    title: strings.tabs.partner.profile,
    icon: "account-outline",
    focusedIcon: "account",
  },
];

export default function PartnerTabsLayout() {
  const { hideBottomTabBar } = useResponsiveLayout();
  return <AppTabsLayout tabs={partnerTabs} hideTabBar={hideBottomTabBar} />;
}
