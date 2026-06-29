import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import {
  CustomerScheduleSlotSection,
  type ScheduleSlotValue,
} from "@/components/customer-schedule-slot-section";
import { Spacer } from "@/components";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { isBeforeDate, isSameDay } from "@/utils/schedule-datetime";

const c = theme.colors;

export default function SchedulePickupScreen() {
  const router = useRouter();
  const { draft, setPickupSchedule, setDeliverySchedule } = useCustomerOrderDraft();
  const s = strings.customer.schedulePickupDelivery;
  const sPickup = strings.customer.schedulePickup;
  const sDelivery = strings.customer.scheduleDelivery;

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
    router.replace("/(customer)/order-summary");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CustomerScheduleSlotSection
          sectionTitle={s.pickupSection}
          strings={sPickup}
          minDate={today}
          initialDateIso={draft.pickup?.dateIso}
          initialTimeSlotLabel={draft.pickup?.timeSlotLabel}
          onChange={onPickupChange}
        />

        <Spacer.Column numberOfSpaces={6} />

        <CustomerScheduleSlotSection
          sectionTitle={s.deliverySection}
          strings={sDelivery}
          minDate={deliveryMinDate}
          minTimeSlotIndex={deliveryMinTimeSlotIndex}
          initialDateIso={draft.delivery?.dateIso}
          initialTimeSlotLabel={draft.delivery?.timeSlotLabel}
          onChange={onDeliveryChange}
        />

        <Spacer.Column numberOfSpaces={8} />
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
        >
          <Text style={styles.confirmLabel}>{s.confirm}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  confirmBtn: {
    backgroundColor: c.blue500,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.background,
  },
});
