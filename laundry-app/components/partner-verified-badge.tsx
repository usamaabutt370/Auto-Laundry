import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type StyleProp, type ViewStyle } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

type PartnerVerifiedBadgeProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function PartnerVerifiedBadge({
  size = 12,
  color = c.outline,
  style,
}: PartnerVerifiedBadgeProps) {
  return (
    <MaterialCommunityIcons
      name="check-decagram"
      size={size}
      color={color}
      style={style}
      accessibilityLabel="Verified partner"
    />
  );
}
