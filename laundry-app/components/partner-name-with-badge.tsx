import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { PartnerVerifiedBadge } from "@/components/partner-verified-badge";

type PartnerNameWithBadgeProps = {
  name: string;
  verified?: boolean;
  nameStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  badgeSize?: number;
  badgeColor?: string;
};

export function PartnerNameWithBadge({
  name,
  verified = false,
  nameStyle,
  containerStyle,
  numberOfLines = 1,
  badgeSize = 12,
  badgeColor,
}: PartnerNameWithBadgeProps) {
  // Keep the badge on the first line when the name wraps; nudge it down so it
  // sits optically in the middle of that line rather than the absolute top edge.
  const badgeTop = Math.max(0, Math.round(badgeSize * 0.2));

  return (
    <View style={[styles.row, containerStyle]}>
      <Text
        style={[styles.name, nameStyle]}
        {...(numberOfLines > 0 ? { numberOfLines } : {})}
      >
        {name}
      </Text>
      {verified ? (
        <PartnerVerifiedBadge
          size={badgeSize}
          color={badgeColor}
          style={{ marginTop: badgeTop }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
  },
});
