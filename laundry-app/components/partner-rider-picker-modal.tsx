import { Image } from "expo-image";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { PartnerRider } from "@/lib/partner-riders";

const c = theme.colors;
const fs = theme.fontSize;

type PartnerRiderPickerModalProps = {
  visible: boolean;
  riders: PartnerRider[];
  loading?: boolean;
  selectedRiderId: string | null;
  title: string;
  subtitle: string;
  confirmLabel: string;
  cancelLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  confirming?: boolean;
  confirmingLabel?: string;
  onSelectRider: (riderId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function PartnerRiderPickerModal({
  visible,
  riders,
  loading = false,
  selectedRiderId,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  loadingLabel,
  emptyLabel,
  confirming = false,
  confirmingLabel = "Accepting…",
  onSelectRider,
  onConfirm,
  onClose,
}: PartnerRiderPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={confirming ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={confirming ? undefined : onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={c.white} />
              <Text style={styles.loadingText}>{loadingLabel}</Text>
            </View>
          ) : riders.length === 0 ? (
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {riders.map((rider) => {
                const selected = selectedRiderId === rider.id;
                return (
                  <Pressable
                    key={rider.id}
                    onPress={() => onSelectRider(rider.id)}
                    style={({ pressed }) => [
                      styles.riderOption,
                      selected && styles.riderOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Image
                      source={{ uri: rider.photoUrl }}
                      style={styles.riderPhoto}
                      contentFit="cover"
                      accessibilityLabel={`${rider.name} photo`}
                    />
                    <View style={styles.riderTextWrap}>
                      <Text style={styles.riderName}>{rider.name}</Text>
                      <Text style={styles.riderPhone}>{rider.phone}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={confirming}
              style={({ pressed }) => [
                styles.cancelBtn,
                confirming && styles.confirmBtnDisabled,
                pressed && !confirming && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading || confirming || riders.length === 0}
              style={({ pressed }) => [
                styles.confirmBtn,
                (loading || confirming || riders.length === 0) && styles.confirmBtnDisabled,
                pressed && !loading && !confirming && riders.length > 0 && styles.pressed,
              ]}
            >
              {confirming ? (
                <View style={styles.confirmingRow}>
                  <ActivityIndicator color={c.background} size="small" />
                  <Text style={styles.confirmText}>{confirmingLabel}</Text>
                </View>
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    backgroundColor: c.blue900,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
    padding: 20,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fs.descText,
    color: c.blue500,
    marginBottom: 16,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  emptyText: {
    fontSize: fs.descText,
    color: c.blue500,
    paddingVertical: 16,
  },
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  riderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.25)",
    borderRadius: 14,
    padding: 12,
  },
  riderOptionSelected: {
    borderColor: c.outline,
    backgroundColor: "rgba(171, 233, 254, 0.08)",
  },
  riderPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.blue900,
  },
  riderTextWrap: {
    flex: 1,
    gap: 2,
  },
  riderName: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  riderPhone: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.blue500,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: c.outline,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.outline,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
  },
  cancelText: {
    fontSize: fs.descText,
    color: c.blue500,
    fontWeight: "600",
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.outline,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: fs.descText,
    color: c.background,
    fontWeight: "700",
  },
  confirmingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
