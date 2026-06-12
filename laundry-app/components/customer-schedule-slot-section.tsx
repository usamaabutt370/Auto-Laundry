import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
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

const c = theme.colors;

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
              <MaterialCommunityIcons name="chevron-down" size={20} color={c.white} />
            </Pressable>
            <Pressable
              onPress={() => setYearPickerVisible(true)}
              style={({ pressed }) => [styles.yearButton, pressed && styles.pressed]}
            >
              <Text style={styles.yearLabel}>{selectedYear}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={c.white} />
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
        <Image source={assets.icons.clock_icon} style={styles.timeSlotIcon} />
        <Text style={styles.timeSlotLabel}>{dayLabel} :</Text>
        <Text style={styles.timeSlotValue}>{timeSlotLabel}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={c.white} />
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
                      <MaterialCommunityIcons name="check" size={20} color={c.white} />
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
                    <MaterialCommunityIcons name="check" size={20} color={c.white} />
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
                      <MaterialCommunityIcons name="check" size={20} color={c.white} />
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
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 14,
  },
  pressed: { opacity: 0.8 },
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
  },
  calendarHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  },
  yearLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
  todayLabel: {
    fontSize: 14,
    color: c.white,
    opacity: 0.85,
  },
  dateRow: {
    gap: 10,
    paddingRight: 8,
    flexDirection: "row",
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
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "70%",
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.backgroundLight,
  },
  yearPickerCard: {
    maxWidth: 280,
    maxHeight: "60%",
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
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
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
    backgroundColor: c.backgroundLight,
  },
  pickerOptionDisabled: {
    opacity: 0.45,
  },
  pickerOptionText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  pickerOptionTextSelected: {
    fontWeight: "700",
  },
  pickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.backgroundLight,
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
});
