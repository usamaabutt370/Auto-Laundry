import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingActionButton } from "@/components/onboarding-action-button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { getOrderDetail } from "@/data/demo-order-details";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;
/** Screenshot: white card with ~8–12px rounded corners */
const CARD_RADIUS = 12;

export default function PartnerOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { width } = useWindowDimensions();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.order;
  const isCompact = width < 390;

  const detail = useMemo(
    () => (params.orderId ? getOrderDetail(params.orderId) : null),
    [params.orderId],
  );

  const handleBack = () => router.back();

  const header = (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <PartnerHeader
        title={s.orderDetailTitle}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        leftAccessibilityLabel={s.orderDetailTitle}
      />
    </SafeAreaView>
  );

  if (detail == null) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Order not found.</Text>
        </View>
      </View>
    );
  }

  const addressLine2 = detail.addressLine2?.trim()
    ? `${detail.addressLine2}\n${detail.cityStateZip}`
    : detail.cityStateZip;

  return (
    <View style={styles.container}>
      {header}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isCompact && styles.scrollContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={[styles.card, isCompact && styles.cardCompact]}>
          {/* Order # and status */}
          <View style={styles.orderIdRow}>
            <Text
              style={[styles.orderIdText, isCompact && styles.orderIdTextCompact]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {s.orderIdLabel.replace("{{number}}", detail.orderNumber)}
            </Text>
            <Text style={[styles.statusText, isCompact && styles.statusTextCompact]}>
              ({detail.status})
            </Text>
          </View>

          {/* Client + Logistics row */}
          <View style={[styles.twoCol, isCompact && styles.twoColCompact]}>
            <View style={styles.clientCol}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{detail.clientInitial}</Text>
              </View>
              <Text style={styles.clientName}>{detail.clientName}</Text>
              <Text style={styles.phone}>{detail.phone}</Text>
              <Text style={styles.address}>{detail.addressLine1}</Text>
              <Text style={styles.address}>{addressLine2}</Text>
            </View>
            <View style={[styles.logisticsCol, isCompact && styles.logisticsColCompact]}>
              <Text style={styles.logisticsRow}>
                <Text style={styles.logisticsLabel}>{s.pickup}: </Text>
                <Text style={styles.logisticsValue}>{detail.pickup}</Text>
              </Text>
              <Text style={styles.logisticsRow}>
                <Text style={styles.logisticsLabel}>{s.delivery}: </Text>
                <Text style={styles.logisticsValue}>{detail.delivery}</Text>
              </Text>
              <View style={styles.courierRow}>
                <Text style={styles.logisticsLabel}>{s.courier}: </Text>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color={c.blue500}
                />
                <Text style={[styles.logisticsValue, styles.courierValue]}>
                  {detail.courier === "Not Yet Assigned"
                    ? s.notYetAssigned
                    : detail.courier}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={18}
                  color={c.blue500}
                />
              </View>
            </View>
          </View>

          {/* Bags */}
          {detail.bags.map((bag, index) => (
            <View key={bag.id} style={styles.bagSection}>
              <View style={styles.bagHeader}>
                <Text style={styles.bagTitle}>
                  {s.bagLabel.replace("{{n}}", String(index + 1))}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={c.white}
                />
              </View>
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>{s.service}: </Text>
                <Text style={styles.detailValue}>{bag.service}</Text>
              </Text>
              <View style={styles.detailRowWithIcon}>
                <Text style={styles.detailLabel}>{s.weight}: </Text>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color={c.blue500}
                />
                <Text style={styles.detailValue}>{bag.weight}</Text>
                <MaterialCommunityIcons
                  name="pencil"
                  size={16}
                  color={c.blue500}
                />
              </View>
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>{s.nbrOfItems}: </Text>
                <Text style={styles.detailValue}>{bag.numItems}</Text>
              </Text>
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>{s.preferences}: </Text>
                <Text style={styles.detailValue}>{bag.preferences}</Text>
              </Text>
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>{s.estimatedPrice}: </Text>
                <Text style={styles.detailValue}>{bag.estimatedPrice}$</Text>
              </Text>
            </View>
          ))}

          {/* Special instructions – white input, light gray border per screenshot */}
          <TextInput
            style={styles.specialInput}
            placeholder={s.specialInstructionsPlaceholder}
            placeholderTextColor={c.themeGray}
            multiline
            scrollEnabled
          />

          <OnboardingActionButton
            label={s.confirmAssignment}
            onPress={() => {}}
            style={styles.confirmButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 8,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: H_PAD,
    paddingBottom: 32,
  },
  scrollContentCompact: {
    paddingHorizontal: 16,
  },
  /** Dark card to match app */
  card: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: H_PAD,
  },
  cardCompact: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  pressed: { opacity: 0.85 },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
    gap: 8,
  },
  orderIdText: {
    flex: 1,
    fontSize: fs.titleNormal,
    fontWeight: "700",
    color: c.white,
  },
  orderIdTextCompact: {
    fontSize: fs.titleMedium,
  },
  statusText: {
    fontSize: fs.descText,
    color: c.white,
  },
  statusTextCompact: {
    fontSize: fs.xSmallText,
  },
  twoCol: {
    flexDirection: "row",
    marginBottom: 20,
    columnGap: 16,
  },
  twoColCompact: {
    columnGap: 10,
  },
  clientCol: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: fs.smallTitle,
    fontWeight: "600",
    color: c.white,
  },
  clientName: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 4,
  },
  phone: {
    fontSize: fs.descText,
    color: c.blue500,
    marginBottom: 4,
  },
  address: {
    fontSize: fs.descText,
    color: c.white,
  },
  logisticsCol: {
    flex: 1,
    justifyContent: "flex-start",
    minWidth: 0,
  },
  logisticsColCompact: {
    minWidth: 0,
  },
  logisticsRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  logisticsLabel: {
    fontSize: fs.descText,
    color: c.white,
  },
  logisticsValue: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  courierRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    maxWidth: "100%",
  },
  courierValue: {
    flexShrink: 1,
  },
  bagSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.outline,
  },
  bagHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bagTitle: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  detailRowWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  detailLabel: {
    fontSize: fs.descText,
    color: c.white,
  },
  detailValue: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  specialInput: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: fs.descText,
    color: c.themeBlack,
    height: 100,
    maxHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  confirmButton: {
    alignSelf: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: H_PAD,
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
  },
});
