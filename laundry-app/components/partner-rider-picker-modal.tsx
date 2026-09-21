import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientLoader } from "@/components/ui/gradient-loader";

import { theme, UI } from "@/constants/theme";
import type { PartnerRider } from "@/lib/partner-riders";

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

/** Rider picker overlay without RN Modal — avoids iOS touch freeze after accept. */
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
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
      <Pressable
        style={styles.backdrop}
        onPress={confirming ? undefined : onClose}
        accessibilityRole="button"
      />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <GradientLoader />
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
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.confirmText}>{confirmingLabel}</Text>
              </View>
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 20,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    zIndex: 1,
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fs.descText,
    color: UI.muted,
    marginBottom: 16,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: fs.descText,
    color: UI.muted,
  },
  emptyText: {
    fontSize: fs.descText,
    color: UI.muted,
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
    borderColor: UI.chipBorder,
    borderRadius: 14,
    padding: 12,
  },
  riderOptionSelected: {
    borderColor: UI.teal,
    backgroundColor: UI.mint,
  },
  riderPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.mint,
  },
  riderTextWrap: {
    flex: 1,
    gap: 2,
  },
  riderName: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: UI.text,
  },
  riderPhone: {
    fontSize: fs.descText,
    color: UI.muted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: UI.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: UI.teal,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UI.teal,
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
    borderColor: UI.chipBorder,
  },
  cancelText: {
    fontSize: fs.descText,
    color: UI.muted,
    fontWeight: "600",
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: UI.teal,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: fs.descText,
    color: "#FFFFFF",
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
