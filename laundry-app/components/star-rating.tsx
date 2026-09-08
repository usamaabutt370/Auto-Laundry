import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

const STAR_COLOR = "#F5B301";
const STAR_EMPTY = "#E5E7EB";

type Props = {
  value: number | null | undefined;
  size?: number;
  showValue?: boolean;
};

function StarSlot({
  fill,
  size,
}: {
  fill: number;
  size: number;
}) {
  const width = Math.max(0, Math.min(1, fill)) * size;
  return (
    <View style={{ width: size, height: size }}>
      <MaterialCommunityIcons name="star" size={size} color={STAR_EMPTY} />
      {width > 0 ? (
        <View style={[styles.fillClip, { width }]}>
          <MaterialCommunityIcons name="star" size={size} color={STAR_COLOR} />
        </View>
      ) : null}
    </View>
  );
}

export function StarRating({ value, size = 14, showValue = false }: Props) {
  const rating = Number(value);
  const safe = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const label = Number.isFinite(rating) && rating > 0 ? (Number.isInteger(safe) ? String(safe) : safe.toFixed(1)) : null;

  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel={label ? `${label} out of 5 stars` : "No ratings yet"}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <StarSlot key={index} size={size} fill={safe - index} />
      ))}
      {showValue && label ? <Text style={styles.value}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  fillClip: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    overflow: "hidden",
  },
  value: {
    marginLeft: 4,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Poppins-SemiBold",
  },
});
