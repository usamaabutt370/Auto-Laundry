import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type StyleProp, type ViewStyle } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

type PartnerVerifiedBadgeProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function PartnerVerifiedBadge({ size = 12, style }: PartnerVerifiedBadgeProps) {
  return (
    <MaterialCommunityIcons
      name="check-decagram"
      size={size}
      color={c.outline}
      style={style}
      accessibilityLabel="Verified partner"
    />
  );
}
