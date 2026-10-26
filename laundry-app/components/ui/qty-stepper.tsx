import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

type Props = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Color for the + icon (default teal). */
  incrementColor?: string;
  disabledDecrement?: boolean;
  accessibilityLabelDecrement?: string;
  accessibilityLabelIncrement?: string;
};

/**
 * Compact +/- qty control that shrinks on narrow phones so list rows keep text space.
 */
export function QtyStepper({
  value,
  onDecrement,
  onIncrement,
  incrementColor = UI.teal,
  disabledDecrement,
  accessibilityLabelDecrement = "Decrease quantity",
  accessibilityLabelIncrement = "Increase quantity",
}: Props) {
  const { s, ms, isNarrow } = useResponsiveLayout();
  const btn = s(isNarrow ? 24 : 28);
  const gap = s(isNarrow ? 4 : 6);
  const canDecrement = !(disabledDecrement ?? value <= 0);

  return (
    <View style={[styles.row, { gap }]}>
      <Pressable
        onPress={onDecrement}
        disabled={!canDecrement}
        style={[
          styles.btn,
          { width: btn, height: btn, borderRadius: btn / 2 },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelDecrement}
      >
        <MaterialCommunityIcons
          name="minus"
          size={isNarrow ? 14 : 16}
          color={canDecrement ? UI.text : "#D1D5DB"}
        />
      </Pressable>
      <Text
        style={[
          styles.value,
          {
            fontSize: ms(isNarrow ? 13 : 14),
            minWidth: s(isNarrow ? 18 : 22),
          },
        ]}
      >
        {value}
      </Text>
      <Pressable
        onPress={onIncrement}
        style={[
          styles.btn,
          { width: btn, height: btn, borderRadius: btn / 2 },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelIncrement}
      >
        <MaterialCommunityIcons
          name="plus"
          size={isNarrow ? 14 : 16}
          color={incrementColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  btn: {
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
  },
});
