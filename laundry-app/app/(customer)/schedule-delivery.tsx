import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { Spacer } from "@/components";
import { assets } from "@/assets/assets";
import { Image } from "expo-image";

const c = theme.colors;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDatesForMonth(
  year: number,
  month: number,
): { date: Date; dayLabel: string; dayNum: string; isToday: boolean }[] {
  const out: {
    date: Date;
    dayLabel: string;
    dayNum: string;
    isToday: boolean;
  }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    out.push({
      date: d,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: String(day),
      isToday,
    });
  }
  return out;
}

function formatTodayString(): string {
  const d = new Date();
  return `${DAY_LABELS[d.getDay()]} ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Today" | "Tomorrow" | "Wed, Apr 14" */
function getDayLabel(
  selectedDate: Date,
  today: Date,
  todayStr: string,
  tomorrowStr: string,
): string {
  const s = new Date(selectedDate);
  const t = new Date(today);
  s.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (s.getTime() - t.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return todayStr;
  if (diffDays === 1) return tomorrowStr;
  return `${DAY_LABELS[selectedDate.getDay()]}, ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
}

/** 8am–8pm, 1hr slots: "8am - 9am", "9am - 10am", ... "7pm - 8pm" */
function buildTimeSlots(): string[] {
  const slots: string[] = [];
  const format = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  for (let start = 8; start < 20; start++) {
    const end = start + 1;
    slots.push(`${format(start)} - ${format(end)}`);
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - 1 + i); // e.g. 2024–2029

export default function ScheduleDeliveryScreen() {
  const router = useRouter();
  const { setDeliverySchedule } = useCustomerOrderDraft();
  const s = strings.customer.scheduleDelivery;
  const [instructions, setInstructions] = useState("");
  const [selectedTimeSlotIndex, setSelectedTimeSlotIndex] = useState(3); // 11am - 12pm
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDateIndex, setSelectedDateIndex] = useState(
    Math.min(
      now.getDate() - 1,
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - 1,
    ),
  );
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const today = useMemo(() => new Date(), []);
  const datesInMonth = useMemo(
    () => getDatesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );
  const dayLabel = useMemo(
    () =>
      getDayLabel(
        datesInMonth[selectedDateIndex]?.date ?? today,
        today,
        s.today,
        s.tomorrow,
      ),
    [datesInMonth, selectedDateIndex, today, s.today, s.tomorrow],
  );
  const timeSlotLabel =
    TIME_SLOTS[selectedTimeSlotIndex] ?? s.timeSlotPlaceholder;

  const selectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setSelectedDateIndex(0);
    setMonthPickerVisible(false);
  };

  const selectYear = (year: number) => {
    setSelectedYear(year);
    const daysInNewMonth = new Date(year, selectedMonth + 1, 0).getDate();
    setSelectedDateIndex((prev) => Math.min(prev, daysInNewMonth - 1));
    setYearPickerVisible(false);
  };

  const handleConfirm = () => {
    const selectedDate = datesInMonth[selectedDateIndex]?.date ?? today;
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();
    const dateIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setDeliverySchedule({
      dateIso,
      timeSlotLabel,
      dayLabel,
      instructions: instructions.trim(),
    });
    router.push("/(customer)/order-summary");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{s.title}</Text>
        <View style={styles.headerRight} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Date / calendar section */}
        <View style={styles.calendarBlock}>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarHeaderLeft}>
              <Pressable
                onPress={() => setMonthPickerVisible(true)}
                style={({ pressed }) => [
                  styles.monthButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.monthLabel}>
                  {MONTH_NAMES_EN[selectedMonth]}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={c.white}
                />
              </Pressable>
              <Pressable
                onPress={() => setYearPickerVisible(true)}
                style={({ pressed }) => [
                  styles.yearButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.yearLabel}>{selectedYear}</Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={c.white}
                />
              </Pressable>
            </View>
            <Text style={styles.todayLabel}>
              {s.today} - {formatTodayString()}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {datesInMonth.map((item, index) => {
              const isSelected = selectedDateIndex === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDateIndex(index)}
                  style={[
                    styles.datePill,
                    isSelected && styles.datePillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillDay,
                      isSelected && styles.datePillDaySelected,
                    ]}
                  >
                    {item.dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.datePillNum,
                      isSelected && styles.datePillNumSelected,
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <Spacer.Column numberOfSpaces={10} />

        {/* Time section */}
        <Text style={styles.sectionTitle}>{s.time}</Text>
        <Pressable
          onPress={() => setTimePickerVisible(true)}
          style={({ pressed }) => [
            styles.timeSlotRow,
            pressed && styles.pressed,
          ]}
        >
          <Image source={assets.icons.clock_icon} style={styles.timeSlotIcon} />
          <Text style={styles.timeSlotLabel}>{dayLabel} :</Text>
          <Text style={styles.timeSlotValue}>{timeSlotLabel}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={22}
            color={c.white}
          />
        </Pressable>

        {/* Instructions */}
        <Spacer.Column numberOfSpaces={5} />
        <Text style={styles.sectionTitle}>{s.instructions}</Text>
        <TextInput
          style={styles.instructionsInput}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={s.instructionsPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.5)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Spacer.Column numberOfSpaces={10} />
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.confirmLabel}>{s.confirm}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>

      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <Pressable
          style={styles.monthPickerOverlay}
          onPress={() => setMonthPickerVisible(false)}
        >
          <Pressable style={styles.monthPickerCard} onPress={() => {}}>
            <Text style={styles.monthPickerTitle}>Select month</Text>
            <ScrollView
              style={styles.monthPickerList}
              showsVerticalScrollIndicator={false}
            >
              {MONTH_NAMES_EN.map((name, index) => (
                <Pressable
                  key={index}
                  onPress={() => selectMonth(index)}
                  style={[
                    styles.monthPickerOption,
                    selectedMonth === index && styles.monthPickerOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthPickerOptionText,
                      selectedMonth === index &&
                        styles.monthPickerOptionTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                  {selectedMonth === index && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={c.white}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [
                styles.monthPickerClose,
                pressed && styles.pressed,
              ]}
              onPress={() => setMonthPickerVisible(false)}
            >
              <Text style={styles.monthPickerCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={yearPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <Pressable
          style={styles.yearPickerOverlay}
          onPress={() => setYearPickerVisible(false)}
        >
          <Pressable style={styles.yearPickerCard} onPress={() => {}}>
            <Text style={styles.yearPickerTitle}>Select year</Text>
            <ScrollView
              style={styles.yearPickerList}
              showsVerticalScrollIndicator={false}
            >
              {YEAR_OPTIONS.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => selectYear(year)}
                  style={[
                    styles.yearPickerOption,
                    selectedYear === year && styles.yearPickerOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.yearPickerOptionText,
                      selectedYear === year &&
                        styles.yearPickerOptionTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                  {selectedYear === year && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={c.white}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [
                styles.yearPickerClose,
                pressed && styles.pressed,
              ]}
              onPress={() => setYearPickerVisible(false)}
            >
              <Text style={styles.yearPickerCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <Pressable
          style={styles.timePickerOverlay}
          onPress={() => setTimePickerVisible(false)}
        >
          <Pressable style={styles.timePickerCard} onPress={() => {}}>
            <Text style={styles.timePickerTitle}>{s.time}</Text>
            <ScrollView
              style={styles.timePickerList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {TIME_SLOTS.map((label, index) => {
                const isSelected = selectedTimeSlotIndex === index;
                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setSelectedTimeSlotIndex(index);
                      setTimePickerVisible(false);
                    }}
                    style={[
                      styles.timePickerOption,
                      isSelected && styles.timePickerOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePickerOptionText,
                        isSelected && styles.timePickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={c.white}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [
                styles.timePickerClose,
                pressed && styles.pressed,
              ]}
              onPress={() => setTimePickerVisible(false)}
            >
              <Text style={styles.timePickerCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
  },
  headerRight: {
    width: 40,
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
  calendarBlock: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  calendarHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
  },
  monthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
  yearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
  },
  yearLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
  todayLabel: {
    fontSize: 14,
    color: c.white,
    opacity: 0.85,
    backgroundColor: "transparent",
  },
  dateRow: {
    gap: 10,
    paddingRight: 8,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  datePill: {
    gap: 16,
    minWidth: 56,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: c.blue900,
  },
  datePillSelected: {
    backgroundColor: c.backgroundLight,
  },
  datePillDay: {
    fontSize: 13,
    color: c.white,
    opacity: 0.9,
    marginBottom: 2,
  },
  datePillDaySelected: {
    color: c.white,
    fontWeight: "600",
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
    opacity: 0.9,
  },
  datePillNumSelected: {
    color: c.white,
  },
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  monthPickerCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "70%",
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.backgroundLight,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 16,
    textAlign: "center",
  },
  monthPickerList: {
    maxHeight: 320,
  },
  monthPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  monthPickerOptionSelected: {
    backgroundColor: c.backgroundLight,
  },
  monthPickerOptionText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  monthPickerOptionTextSelected: {
    fontWeight: "700",
  },
  monthPickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.backgroundLight,
  },
  monthPickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  yearPickerCard: {
    width: "100%",
    maxWidth: 280,
    maxHeight: "60%",
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.backgroundLight,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 16,
    textAlign: "center",
  },
  yearPickerList: {
    maxHeight: 280,
  },
  yearPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  yearPickerOptionSelected: {
    backgroundColor: c.backgroundLight,
  },
  yearPickerOptionText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  yearPickerOptionTextSelected: {
    fontWeight: "700",
  },
  yearPickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.backgroundLight,
  },
  yearPickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: c.white,
    marginBottom: 12,
  },
  timeSlotIcon: {
    width: 20,
    height: 20,
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  timePickerCard: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "75%",
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 16,
    textAlign: "center",
  },
  timePickerList: {
    maxHeight: 360,
  },
  timePickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  timePickerOptionSelected: {
    backgroundColor: c.backgroundLight,
  },
  timePickerOptionText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  timePickerOptionTextSelected: {
    fontWeight: "700",
  },
  timePickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.backgroundLight,
  },
  timePickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
  timeSlotLabel: {
    fontSize: 15,
    color: c.white,
    fontWeight: "500",
  },
  timeSlotValue: {
    flex: 1,
    fontSize: 15,
    color: c.white,
  },
  instructionsInput: {
    backgroundColor: c.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.themeBlack,
    minHeight: 120,
    marginBottom: 28,
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
