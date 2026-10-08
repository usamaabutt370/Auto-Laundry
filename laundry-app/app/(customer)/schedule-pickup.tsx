import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import {
  CustomerScheduleSlotSection,
  type ScheduleSlotValue,
} from "@/components/customer-schedule-slot-section";
import { AppCtaButton } from "@/components/ui/cta-button";
import { strings } from "@/constants/strings";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { isBeforeDate, isSameDay } from "@/utils/schedule-datetime";
import { UI } from "@/constants/theme";

export default function SchedulePickupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ next?: string; from?: string }>();
  const goToSummaryAfterConfirm = params.next === "summary";
  const { draft, setPickupSchedule, setDeliverySchedule } = useCustomerOrderDraft();
  const s = strings.customer.schedulePickupDelivery;
  const sPickup = strings.customer.schedulePickup;
  const sDelivery = strings.customer.scheduleDelivery;
  const sheetHeight = Math.round(height * 0.9);

  const today = useMemo(() => new Date(), []);
  const [pickupSlot, setPickupSlot] = useState<ScheduleSlotValue | null>(null);
  const [deliverySlot, setDeliverySlot] = useState<ScheduleSlotValue | null>(null);

  const onPickupChange = useCallback((value: ScheduleSlotValue) => {
    setPickupSlot(value);
  }, []);

  const onDeliveryChange = useCallback((value: ScheduleSlotValue) => {
    setDeliverySlot(value);
  }, []);

  const deliveryMinDate = pickupSlot?.date ?? today;
  const deliveryMinTimeSlotIndex = useMemo(() => {
    if (!pickupSlot) return 0;
    const referenceDate = deliverySlot?.date ?? deliveryMinDate;
    return isSameDay(referenceDate, pickupSlot.date) ? pickupSlot.timeSlotIndex : 0;
  }, [deliveryMinDate, deliverySlot, pickupSlot]);

  const closeSheet = useCallback(() => {
    if (typeof router.canDismiss === "function" && router.canDismiss()) {
      router.dismiss();
      return;
    }
    router.back();
  }, [router]);

  const handleConfirm = () => {
    if (!pickupSlot || !deliverySlot) {
      showAppAlert(s.title, s.incompleteSchedule);
      return;
    }
    if (isBeforeDate(deliverySlot.date, pickupSlot.date)) {
      showAppAlert(s.title, s.deliveryBeforePickup);
      return;
    }
    if (
      isSameDay(deliverySlot.date, pickupSlot.date) &&
      deliverySlot.timeSlotIndex < pickupSlot.timeSlotIndex
    ) {
      showAppAlert(s.title, s.deliveryTimeBeforePickup);
      return;
    }

    setPickupSchedule({
      dateIso: pickupSlot.dateIso,
      timeSlotLabel: pickupSlot.timeSlotLabel,
      dayLabel: pickupSlot.dayLabel,
      instructions: pickupSlot.instructions,
    });
    setDeliverySchedule({
      dateIso: deliverySlot.dateIso,
      timeSlotLabel: deliverySlot.timeSlotLabel,
      dayLabel: deliverySlot.dayLabel,
      instructions: deliverySlot.instructions,
    });

    if (goToSummaryAfterConfirm) {
      router.replace("/(customer)/order-summary");
      return;
    }
    // From review (or launderer detail): close sheet and stay on previous screen.
    closeSheet();
  };

  const close = closeSheet;

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.dismiss}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {s.title}
          </Text>
          <Pressable
            onPress={close}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CustomerScheduleSlotSection
            sectionTitle={s.pickupSection}
            strings={sPickup}
            minDate={today}
            initialDateIso={draft.pickup?.dateIso}
            initialTimeSlotLabel={draft.pickup?.timeSlotLabel}
            onChange={onPickupChange}
          />

          <CustomerScheduleSlotSection
            sectionTitle={s.deliverySection}
            strings={sDelivery}
            minDate={deliveryMinDate}
            minTimeSlotIndex={deliveryMinTimeSlotIndex}
            initialDateIso={draft.delivery?.dateIso}
            initialTimeSlotLabel={draft.delivery?.timeSlotLabel}
            onChange={onDeliveryChange}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppCtaButton
            label={s.confirm}
            onPress={handleConfirm}
            width="full"
            accessibilityLabel={s.confirm}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: UI.bg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  headerSide: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: UI.bg,
  },
});
