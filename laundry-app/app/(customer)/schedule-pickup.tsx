import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import {
  CustomerScheduleSlotSection,
  type ScheduleSlotValue,
} from "@/components/customer-schedule-slot-section";
import { strings } from "@/constants/strings";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { isBeforeDate, isSameDay } from "@/utils/schedule-datetime";

const UI = {
  bg: "#F7F8FA",
  text: "#111827",
  backBg: "#EEF2F6",
};

export default function SchedulePickupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {s.title}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>
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
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmWrap, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={s.confirm}
        >
          <LinearGradient
            colors={["#4A3AFF", "#12B886"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmLabel}>{s.confirm}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  headerSafe: {
    backgroundColor: UI.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
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
  pressed: {
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: UI.bg,
  },
  confirmWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
});
