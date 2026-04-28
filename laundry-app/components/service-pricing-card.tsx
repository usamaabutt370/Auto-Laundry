import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

export interface ServicePricingCardProps {
  /** Service or product name */
  title: string;
  /** Display string for price (e.g. "Rs 28.79" or "Rs 1.49 per lb") */
  price: string;
  /** Called when the edit (pencil) icon is pressed (omit when readOnly) */
  onEdit?: () => void;
  /** Called when the delete (cross) icon is pressed (omit when readOnly) */
  onDelete?: () => void;
  /** When true, only title and price are shown (no edit/delete icons) */
  readOnly?: boolean;
  /** Optional style for the card container (e.g. marginBottom: 0 when inside a row) */
  containerStyle?: object;
}

/**
 * Reusable card for a single service/price row with edit and delete actions.
 * Use in lists that you manage dynamically (add, edit, remove).
 */
export function ServicePricingCard({
  title,
  price,
  onEdit,
  onDelete,
  readOnly = false,
  containerStyle,
}: ServicePricingCardProps) {
  const { locale } = useLocale();
  const s = getStrings(locale).partner.settings;

  return (
    <View style={[styles.card, containerStyle]}>
      <View style={styles.info}>
        <View style={styles.leftHalf}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <Text style={styles.separator}> – </Text>
        <View style={styles.rightHalf}>
          <Text style={styles.price} numberOfLines={1}>
            {s.priceLabel} : {price}
          </Text>
        </View>
      </View>
      {!readOnly && onEdit != null && onDelete != null && (
        <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${s.edit} ${title}`}
          >
            <MaterialCommunityIcons name="pencil" size={22} color={c.white} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${s.delete} ${title}`}
          >
            <MaterialCommunityIcons name="close" size={22} color={c.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.blue900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  leftHalf: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    minWidth: 0,
  },
  title: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  separator: {
    fontSize: fs.smallText,
    color: c.blue500,
    marginHorizontal: 4,
  },
  rightHalf: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 0,
  },
  price: {
    fontSize: fs.smallText,
    color: c.blue500,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 8,
  },
  iconBtn: {
    padding: 6,
  },
  pressed: {
    opacity: 0.8,
  },
});
