import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
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

import { showAppAlert } from "@/components/app-alert";
import { useLocale } from "@/contexts/locale-context";
import { submitOrderDispute } from "@/lib/order-disputes";
import { getStrings } from "@/locales";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  openBg: "#ECFDF5",
  openText: "#047857",
};
const MAX_PHOTOS = 3;

type PendingPhoto = {
  uri: string;
  mimeType?: string | null;
};

type ReportOrderProblemModalProps = {
  visible: boolean;
  orderId: string;
  orderRef: string;
  customerId: string;
  partnerId: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportOrderProblemModal({
  visible,
  orderId,
  orderRef,
  customerId,
  partnerId,
  onClose,
  onSubmitted,
}: ReportOrderProblemModalProps) {
  const { locale } = useLocale();
  const s = getStrings(locale).customer.reportProblem;
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDescription("");
    setPhotos([]);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      showAppAlert(s.photoLimitTitle, s.photoLimitMessage.replace("{{max}}", String(MAX_PHOTOS)));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(s.permissionTitle, s.permissionMessage);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPhotos((prev) => [
      ...prev,
      { uri: asset.uri, mimeType: asset.mimeType ?? null },
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAppAlert(s.requiredTitle, s.requiredMessage);
      return;
    }

    setSubmitting(true);
    const result = await submitOrderDispute({
      orderId,
      customerId,
      partnerId,
      description: description.trim(),
      photoUris: photos.map((p) => p.uri),
      photoMimeTypes: photos.map((p) => p.mimeType),
    });
    setSubmitting(false);

    if (!result.ok) {
      showAppAlert(s.submitErrorTitle, result.error);
      return;
    }

    reset();
    onSubmitted?.();
    onClose();
    showAppAlert(s.submitSuccessTitle, s.submitSuccessMessage);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>
              {s.subtitle.replace("{{ref}}", orderRef)}
            </Text>
            <View style={styles.adminNoteBox}>
              <Text style={styles.adminNote}>{s.adminNote}</Text>
            </View>

            <Text style={styles.label}>{s.descriptionLabel}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={s.descriptionPlaceholder}
              placeholderTextColor={UI.muted}
              multiline
              textAlignVertical="top"
              style={styles.input}
              editable={!submitting}
            />

            <Text style={styles.label}>{s.photosLabel}</Text>
            <View style={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                  <Pressable
                    onPress={() => removePhoto(index)}
                    style={styles.removePhotoBtn}
                    disabled={submitting}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <Pressable
                  onPress={() => void pickPhoto()}
                  style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.pressed]}
                  disabled={submitting}
                >
                  <MaterialCommunityIcons name="camera-plus-outline" size={24} color={UI.teal} />
                  <Text style={styles.addPhotoText}>{s.addPhoto}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={handleClose}
                style={[styles.cancelBtn, submitting && styles.disabled]}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>{s.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSubmit()}
                style={[styles.submitWrap, submitting && styles.disabled]}
                disabled={submitting}
              >
                <LinearGradient
                  colors={["#4A3AFF", "#12B886"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.submitBtn}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>{s.submit}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  card: {
    maxHeight: "88%",
    borderRadius: 20,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: UI.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 10,
  },
  adminNoteBox: {
    backgroundColor: UI.openBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  adminNote: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.openText,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: UI.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    color: UI.text,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    lineHeight: 21,
    padding: 12,
    marginBottom: 16,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  photoWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: UI.bg,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  addPhotoBtn: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.teal,
    borderStyle: "dashed",
    backgroundColor: UI.openBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.teal,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: UI.text,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
  },
  submitWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});
