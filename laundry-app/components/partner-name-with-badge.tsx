import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { PartnerVerifiedBadge } from "@/components/partner-verified-badge";

type PartnerNameWithBadgeProps = {
  name: string;
  verified?: boolean;
  nameStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  badgeSize?: number;
};

export function PartnerNameWithBadge({
  name,
  verified = false,
  nameStyle,
  containerStyle,
  numberOfLines = 1,
  badgeSize = 12,
}: PartnerNameWithBadgeProps) {
  return (
    <View style={[styles.row, containerStyle]}>
      <Text style={[styles.name, nameStyle]} numberOfLines={numberOfLines}>
        {name}
      </Text>
      {verified ? <PartnerVerifiedBadge size={badgeSize} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
  },
});
