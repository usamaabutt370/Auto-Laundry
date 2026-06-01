import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

type WashFoldPackageBoxBase = {
  title: string;
  description: string;
  style?: StyleProp<ViewStyle>;
};

export type WashFoldPackageBoxPartnerProps = WashFoldPackageBoxBase & {
  mode: "partner";
  priceValue: string;
  pricePlaceholder: string;
  onPriceChange: (text: string) => void;
  priceSetLabel: string;
  onRemove?: () => void;
  removeAccessibilityLabel?: string;
};

export type WashFoldPackageBoxCustomerProps = WashFoldPackageBoxBase & {
  mode: "customer";
  priceDisplay: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

export type WashFoldPackageBoxProps =
  | WashFoldPackageBoxPartnerProps
  | WashFoldPackageBoxCustomerProps;

export function WashFoldPackageGrid({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

export function WashFoldPackageBox(props: WashFoldPackageBoxProps) {
  const { title, description, style } = props;

  const topRow = (
    <View style={styles.topRow}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={26}
          color={c.lightBlue}
        />
      </View>
      {props.mode === "partner" && props.onRemove ? (
        <Pressable
          onPress={props.onRemove}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={props.removeAccessibilityLabel ?? `Remove ${title}`}
        >
          <MaterialCommunityIcons name="close" size={18} color={c.white} />
        </Pressable>
      ) : null}
      {props.mode === "customer" && props.selected ? (
        <MaterialCommunityIcons name="check-circle" size={22} color={c.lightBlue} />
      ) : null}
    </View>
  );

  const body = (
    <>
      {topRow}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subInfo}>{description}</Text>
      <View style={styles.priceBlock}>
        {props.mode === "partner" ? (
          <TextInput
            style={styles.priceInput}
            placeholder={props.pricePlaceholder}
            placeholderTextColor="rgba(0,0,0,0.4)"
            value={props.priceValue}
            onChangeText={props.onPriceChange}
            keyboardType="decimal-pad"
            editable
            {...(Platform.OS === "android" && { includeFontPadding: false })}
          />
        ) : (
          <Text style={styles.priceDisplay}>{props.priceDisplay}</Text>
        )}
      </View>
      {props.mode === "partner" && props.priceValue.trim().length > 0 ? (
        <View style={styles.setBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color={c.lightBlue} />
          <Text style={styles.setBadgeText}>{props.priceSetLabel}</Text>
        </View>
      ) : null}
    </>
  );

  if (props.mode === "customer") {
    return (
      <Pressable
        onPress={props.onPress}
        style={({ pressed }) => [
          styles.box,
          props.selected && styles.boxSelected,
          pressed && styles.pressed,
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: props.selected }}
        accessibilityLabel={props.accessibilityLabel}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.box, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  box: {
    width: "48%",
    minWidth: 150,
    backgroundColor: c.blue900,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 14,
    marginBottom: 4,
  },
  boxSelected: {
    borderColor: c.lightBlue,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pressed: { opacity: 0.85 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: fs.smallText,
    fontWeight: "800",
    color: c.white,
    lineHeight: 20,
    marginBottom: 6,
  },
  subInfo: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 17,
    marginBottom: 12,
  },
  priceBlock: {
    backgroundColor: c.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceInput: {
    fontSize: 17,
    fontWeight: "700",
    color: c.themeBlack,
    padding: 0,
    minHeight: 24,
  },
  priceDisplay: {
    fontSize: 17,
    fontWeight: "700",
    color: c.themeBlack,
  },
  setBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  setBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.lightBlue,
  },
});
