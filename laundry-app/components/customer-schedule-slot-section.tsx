import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Spacer } from "@/components";
import {
  dateToIso,
  formatTodayString,
  getDatesForMonth,
  getDayLabel,
  isBeforeDate,
  MONTH_NAMES_EN,
  parseIsoDate,
  TIME_SLOTS,
  timeSlotIndexFromLabel,
} from "@/utils/schedule-datetime";

const UI = {
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  openBg: "#ECFDF5",
  chipBorder: "#E5E7EB",
  iconWell: "#F3F4F6",
  shadow: "rgba(17, 24, 39, 0.08)",
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR + i);

export type ScheduleSlotValue = {
  date: Date;
  dateIso: string;
  dayLabel: string;
  timeSlotIndex: number;
  timeSlotLabel: string;
  instructions: string;
};

type Strings = {
  today: string;
  tomorrow: string;
  time: string;
  timeSlotPlaceholder: string;
};

type Props = {
  sectionTitle: string;
  strings: Strings;
  minDate: Date;
  minTimeSlotIndex?: number;
  initialDateIso?: string | null;
  initialTimeSlotLabel?: string | null;
  onChange: (value: ScheduleSlotValue) => void;
};

function initialMonthState(dateIso?: string | null) {
  const parsed = dateIso ? parseIsoDate(dateIso) : null;
  const base = parsed ?? new Date();
  return {
    year: base.getFullYear(),
    month: base.getMonth(),
    dateIndex: Math.max(0, base.getDate() - 1),
  };
}

export function CustomerScheduleSlotSection({
  sectionTitle,
  strings: s,
  minDate,
  minTimeSlotIndex = 0,
  initialDateIso,
  initialTimeSlotLabel,
  onChange,
}: Props) {
  const initialMonth = initialMonthState(initialDateIso);
  const [selectedTimeSlotIndex, setSelectedTimeSlotIndex] = useState(() =>
    Math.max(minTimeSlotIndex, timeSlotIndexFromLabel(initialTimeSlotLabel)),
  );
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(initialMonth.year);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth.month);
  const [selectedDateIndex, setSelectedDateIndex] = useState(initialMonth.dateIndex);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const didApplyInitialDateRef = useRef(false);

  const today = useMemo(() => new Date(), []);
  const minSelectableDate = useMemo(() => {
    const min = new Date(minDate);
    return isBeforeDate(min, today) ? today : min;
  }, [minDate, today]);

  const allDatesInMonth = useMemo(
    () => getDatesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );
  const datesInMonth = useMemo(
    () =>
      allDatesInMonth.filter(
        (item) =>
          !isBeforeDate(item.date, today) && !isBeforeDate(item.date, minSelectableDate),
      ),
    [allDatesInMonth, minSelectableDate, today],
  );

  const safeSelectedDateIndex =
    datesInMonth.length === 0
      ? 0
      : Math.max(0, Math.min(selectedDateIndex, datesInMonth.length - 1));

  const selectedDate = datesInMonth[safeSelectedDateIndex]?.date ?? minSelectableDate;

  const dayLabel = useMemo(
    () => getDayLabel(selectedDate, today, s.today, s.tomorrow),
    [selectedDate, s.today, s.tomorrow, today],
  );

  const safeTimeSlotIndex = Math.max(
    minTimeSlotIndex,
    Math.min(selectedTimeSlotIndex, TIME_SLOTS.length - 1),
  );
  const timeSlotLabel = TIME_SLOTS[safeTimeSlotIndex] ?? s.timeSlotPlaceholder;

  useEffect(() => {
    if (didApplyInitialDateRef.current || !initialDateIso || datesInMonth.length === 0) {
      return;
    }
    const idx = datesInMonth.findIndex(
      (item) => dateToIso(item.date) === initialDateIso.trim(),
    );
    if (idx >= 0) {
      setSelectedDateIndex(idx);
      didApplyInitialDateRef.current = true;
    }
  }, [datesInMonth, initialDateIso]);

  useEffect(() => {
    if (datesInMonth.length === 0) return;
    const current = datesInMonth[safeSelectedDateIndex]?.date;
    if (current && !isBeforeDate(current, minSelectableDate)) return;
    const firstValid = datesInMonth.findIndex(
      (item) => !isBeforeDate(item.date, minSelectableDate),
    );
    setSelectedDateIndex(Math.max(0, firstValid));
  }, [datesInMonth, minSelectableDate, safeSelectedDateIndex]);

  useEffect(() => {
    if (selectedTimeSlotIndex < minTimeSlotIndex) {
      setSelectedTimeSlotIndex(minTimeSlotIndex);
    }
  }, [minTimeSlotIndex, selectedTimeSlotIndex]);

  useEffect(() => {
    onChange({
      date: selectedDate,
      dateIso: dateToIso(selectedDate),
      dayLabel,
      timeSlotIndex: safeTimeSlotIndex,
      timeSlotLabel,
      instructions: "",
    });
  }, [dayLabel, onChange, safeTimeSlotIndex, selectedDate, timeSlotLabel]);

  const selectMonth = (monthIndex: number) => {
    if (selectedYear === CURRENT_YEAR && monthIndex < CURRENT_MONTH) return;
    setSelectedMonth(monthIndex);
    setSelectedDateIndex(0);
    setMonthPickerVisible(false);
  };

  const selectYear = (year: number) => {
    if (year < CURRENT_YEAR) return;
    setSelectedYear(year);
    if (year === CURRENT_YEAR && selectedMonth < CURRENT_MONTH) {
      setSelectedMonth(CURRENT_MONTH);
    }
    setSelectedDateIndex(0);
    setYearPickerVisible(false);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{sectionTitle}</Text>
      <View style={styles.calendarBlock}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarHeaderLeft}>
            <Pressable
              onPress={() => setMonthPickerVisible(true)}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
            >
              <Text style={styles.monthLabel}>{MONTH_NAMES_EN[selectedMonth]}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={UI.muted} />
            </Pressable>
            <Pressable
              onPress={() => setYearPickerVisible(true)}
              style={({ pressed }) => [styles.yearButton, pressed && styles.pressed]}
            >
              <Text style={styles.yearLabel}>{selectedYear}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={UI.muted} />
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
            const isSelected = safeSelectedDateIndex === index;
            return (
              <Pressable
                key={`${dateToIso(item.date)}-${index}`}
                onPress={() => setSelectedDateIndex(index)}
                style={[styles.datePill, isSelected && styles.datePillSelected]}
              >
                <Text
                  style={[styles.datePillDay, isSelected && styles.datePillDaySelected]}
                >
                  {item.dayLabel}
                </Text>
                <Text
                  style={[styles.datePillNum, isSelected && styles.datePillNumSelected]}
                >
                  {item.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Spacer.Column numberOfSpaces={5} />
      <Text style={styles.sectionTitle}>{s.time}</Text>
      <Pressable
        onPress={() => setTimePickerVisible(true)}
        style={({ pressed }) => [styles.timeSlotRow, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="clock-outline" size={20} color={UI.teal} />
        <Text style={styles.timeSlotLabel}>{dayLabel} :</Text>
        <Text style={styles.timeSlotValue}>{timeSlotLabel}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={UI.muted} />
      </Pressable>

      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setMonthPickerVisible(false)}
        >
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select month</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {MONTH_NAMES_EN.map((name, index) => {
                const isPastMonthInCurrentYear =
                  selectedYear === CURRENT_YEAR && index < CURRENT_MONTH;
                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      if (isPastMonthInCurrentYear) return;
                      selectMonth(index);
                    }}
                    disabled={isPastMonthInCurrentYear}
                    style={[
                      styles.pickerOption,
                      selectedMonth === index && styles.pickerOptionSelected,
                      isPastMonthInCurrentYear && styles.pickerOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedMonth === index && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {name}
                    </Text>
                    {selectedMonth === index ? (
                      <MaterialCommunityIcons name="check" size={20} color={UI.teal} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.pickerClose, pressed && styles.pressed]}
              onPress={() => setMonthPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
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
          style={styles.pickerOverlay}
          onPress={() => setYearPickerVisible(false)}
        >
          <Pressable style={[styles.pickerCard, styles.yearPickerCard]} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select year</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {YEAR_OPTIONS.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => selectYear(year)}
                  style={[
                    styles.pickerOption,
                    selectedYear === year && styles.pickerOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedYear === year && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                  {selectedYear === year ? (
                    <MaterialCommunityIcons name="check" size={20} color={UI.teal} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.pickerClose, pressed && styles.pressed]}
              onPress={() => setYearPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
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
          style={styles.pickerOverlay}
          onPress={() => setTimePickerVisible(false)}
        >
          <Pressable style={styles.timePickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>{s.time}</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {TIME_SLOTS.map((label, index) => {
                const isDisabled = index < minTimeSlotIndex;
                const isSelected = safeTimeSlotIndex === index;
                return (
                  <Pressable
                    key={label}
                    onPress={() => {
                      if (isDisabled) return;
                      setSelectedTimeSlotIndex(index);
                      setTimePickerVisible(false);
                    }}
                    disabled={isDisabled}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected,
                      isDisabled && styles.pickerOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons name="check" size={20} color={UI.teal} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.pickerClose, pressed && styles.pressed]}
              onPress={() => setTimePickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 12,
  },
  pressed: { opacity: 0.85 },
  calendarBlock: {
    backgroundColor: UI.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  yearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  yearLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  todayLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    flexShrink: 1,
    textAlign: "right",
  },
  dateRow: {
    gap: 8,
    paddingRight: 8,
    flexDirection: "row",
  },
  datePill: {
    gap: 6,
    minWidth: 56,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: UI.iconWell,
  },
  datePillSelected: {
    backgroundColor: UI.teal,
  },
  datePillDay: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
    marginBottom: 2,
  },
  datePillDaySelected: {
    color: "#FFFFFF",
  },
  datePillNum: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  datePillNumSelected: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    marginBottom: 10,
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  timeSlotLabel: {
    fontSize: 14,
    color: UI.muted,
    fontFamily: "Poppins-Medium",
  },
  timeSlotValue: {
    flex: 1,
    fontSize: 14,
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "70%",
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  yearPickerCard: {
    maxWidth: 280,
    maxHeight: "60%",
  },
  timePickerCard: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "75%",
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 16,
    textAlign: "center",
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  pickerOptionSelected: {
    backgroundColor: UI.openBg,
  },
  pickerOptionDisabled: {
    opacity: 0.45,
  },
  pickerOptionText: {
    fontSize: 16,
    color: UI.text,
    fontFamily: "Poppins-Medium",
  },
  pickerOptionTextSelected: {
    fontFamily: "Poppins-Bold",
    color: UI.teal,
  },
  pickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: UI.teal,
  },
  pickerCloseText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
