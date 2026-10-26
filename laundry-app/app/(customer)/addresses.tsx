import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { useLocale } from "@/contexts/locale-context";
import { gradients, UI } from "@/constants/theme";
import {
  deleteCustomerAddress,
  ensureAddressesFromProfile,
  setDefaultCustomerAddress,
  type AddressIcon,
  type CustomerAddress,
} from "@/lib/customer-addresses";
import { getStrings } from "@/locales";

const PAD = 20;

function iconName(icon: AddressIcon): ComponentProps<typeof MaterialCommunityIcons>["name"] {
  if (icon === "office") return "office-building-outline";
  if (icon === "other") return "map-marker-outline";
  return "home-outline";
}

export default function CustomerAddressesScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.addresses;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CustomerAddress[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ensureAddressesFromProfile();
      setRows(list);
    } catch (err) {
      showAppAlert(
        s.error,
        err instanceof Error ? err.message : s.error,
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [s.error]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openEdit = (id?: string) => {
    router.push({
      pathname: "/(customer)/address-edit",
      params: id ? { id } : {},
    });
  };

  const onMenu = (item: CustomerAddress) => {
    const options = [
      ...(item.isDefault ? [] : [s.setDefault]),
      s.delete,
      s.cancel,
    ];
    const destructiveIndex = options.indexOf(s.delete);
    const cancelIndex = options.indexOf(s.cancel);

    const run = async (action: "default" | "delete") => {
      try {
        if (action === "default") {
          await setDefaultCustomerAddress(item.id);
        } else {
          await deleteCustomerAddress(item.id);
        }
        await load();
      } catch (err) {
        showAppAlert(s.error, err instanceof Error ? err.message : s.error);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (index) => {
          const chosen = options[index];
          if (chosen === s.setDefault) void run("default");
          if (chosen === s.delete) {
            showAppAlert(s.deleteTitle, s.deleteMessage, [
              { text: s.cancel, style: "cancel" },
              {
                text: s.delete,
                style: "destructive",
                onPress: () => void run("delete"),
              },
            ]);
          }
        },
      );
      return;
    }

    showAppAlert(item.label, undefined, [
      ...(item.isDefault
        ? []
        : [
            {
              text: s.setDefault,
              onPress: () => void run("default"),
            },
          ]),
      {
        text: s.delete,
        style: "destructive" as const,
        onPress: () => {
          showAppAlert(s.deleteTitle, s.deleteMessage, [
            { text: s.cancel, style: "cancel" },
            {
              text: s.delete,
              style: "destructive",
              onPress: () => void run("delete"),
            },
          ]);
        },
      },
      { text: s.cancel, style: "cancel" },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={UI.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.subtitle}</Text>
          </View>
          <Pressable
            onPress={() => openEdit()}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={s.addA11y}
          >
            <MaterialCommunityIcons name="plus" size={22} color={UI.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <GradientLoader />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {rows.length === 0 ? (
            <Text style={styles.empty}>{s.empty}</Text>
          ) : (
            rows.map((item) => (
              <View
                key={item.id}
                style={[styles.card, item.isDefault && styles.cardDefault]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconWell}>
                    <MaterialCommunityIcons
                      name={iconName(item.icon)}
                      size={20}
                      color={UI.blue}
                    />
                  </View>
                  <View style={styles.cardTitleCol}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>{s.defaultBadge}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => onMenu(item)}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons
                        name="dots-horizontal"
                        size={20}
                        color={UI.muted}
                      />
                    </Pressable>
                    <Pressable onPress={() => openEdit(item.id)} hitSlop={8}>
                      <Text style={styles.editLink}>{s.edit}</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.addressLine}>
                  {item.selectedLocation || item.addressLine}
                </Text>

                {item.contactName || item.contactPhone ? (
                  <View style={styles.contactRow}>
                    {item.contactName ? (
                      <View style={styles.contactItem}>
                        <MaterialCommunityIcons
                          name="account-outline"
                          size={14}
                          color={UI.muted}
                        />
                        <Text style={styles.contactText} numberOfLines={1}>
                          {item.contactName}
                        </Text>
                      </View>
                    ) : null}
                    {item.contactPhone ? (
                      <View style={styles.contactItem}>
                        <MaterialCommunityIcons
                          name="phone-outline"
                          size={14}
                          color={UI.muted}
                        />
                        <Text style={styles.contactText} numberOfLines={1}>
                          {item.contactPhone}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.chipRow}>
                  <View
                    style={[
                      styles.chip,
                      item.useForPickup ? styles.chipOn : styles.chipOff,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.useForPickup ? "check" : "close"}
                      size={12}
                      color={item.useForPickup ? UI.openText : UI.muted}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        item.useForPickup ? styles.chipTextOn : styles.chipTextOff,
                      ]}
                    >
                      {s.pickup}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chip,
                      item.useForDelivery ? styles.chipOn : styles.chipOff,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.useForDelivery ? "check" : "close"}
                      size={12}
                      color={item.useForDelivery ? UI.openText : UI.muted}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        item.useForDelivery ? styles.chipTextOn : styles.chipTextOff,
                      ]}
                    >
                      {s.delivery}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <Pressable
          onPress={() => openEdit()}
          style={({ pressed }) => [styles.addWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[...gradients.cta]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.addBtn}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.addLabel}>{s.addNew}</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  safeTop: { backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    padding: PAD,
    paddingBottom: 24,
    gap: 12,
  },
  empty: {
    textAlign: "center",
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    marginTop: 40,
    lineHeight: 20,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  cardDefault: {
    borderColor: "#93C5FD",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCol: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  defaultBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.blue,
  },
  cardActions: {
    alignItems: "flex-end",
    gap: 2,
  },
  editLink: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.blue,
  },
  addressLine: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    paddingLeft: 50,
  },
  contactRow: {
    gap: 4,
    paddingLeft: 50,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 50,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipOn: {
    backgroundColor: UI.openBg,
  },
  chipOff: {
    backgroundColor: "#F3F4F6",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  chipTextOn: { color: UI.openText },
  chipTextOff: { color: UI.muted },
  footer: {
    paddingHorizontal: PAD,
    paddingTop: 8,
    backgroundColor: "#F7F8FA",
  },
  addWrap: { borderRadius: 14, overflow: "hidden" },
  addBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  pressed: { opacity: 0.85 },
});
