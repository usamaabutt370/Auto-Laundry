import { AppTabsLayout, type AppTabItem } from "@/components/bottom-tab-bar";
import { strings } from "@/constants/strings";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const customerTabs: AppTabItem[] = [
  {
    name: "index",
    title: strings.tabs.customer.home,
    icon: "home-outline",
    focusedIcon: "home",
  },
  {
    name: "order",
    title: strings.tabs.customer.order,
    icon: "clipboard-text-outline",
    focusedIcon: "clipboard-text",
  },
  {
    name: "chat",
    title: strings.tabs.customer.chat,
    icon: "chat-outline",
    focusedIcon: "chat",
  },
  {
    name: "profile",
    title: strings.tabs.customer.profile,
    icon: "account-outline",
    focusedIcon: "account",
  },
];

export default function CustomerTabsLayout() {
  const { hideBottomTabBar } = useResponsiveLayout();
  return <AppTabsLayout tabs={customerTabs} hideTabBar={hideBottomTabBar} />;
}
