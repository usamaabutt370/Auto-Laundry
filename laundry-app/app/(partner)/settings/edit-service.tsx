import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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

import { AppButton } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { ServicePricingCard } from "@/components/service-pricing-card";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import type { ServiceItem } from "@/types/merchant-services";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

/** Screen 3: Edit/Rename Service – list with edit/delete on each card + Save (back to Screen 1). */
export default function EditServiceScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.settings;
  const { services, updateService, removeService } = useMerchantServices();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");

  const openEdit = useCallback((item: ServiceItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(item.priceDisplay);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingItem(null);
    setFormName("");
    setFormPrice("");
  }, []);

  const handleSaveForm = useCallback(() => {
    const name = formName.trim();
    const price = formPrice.trim();
    if (!editingItem || !name || !price) {
      closeModal();
      return;
    }
    updateService(editingItem.id, { name, priceDisplay: price });
    closeModal();
  }, [editingItem, formName, formPrice, updateService, closeModal]);

  const handleDelete = useCallback(
    (item: ServiceItem) => {
      Alert.alert(s.delete, `Remove "${item.name}"?`, [
        { text: s.cancel, style: "cancel" },
        {
          text: s.delete,
          style: "destructive",
          onPress: () => removeService(item.id),
        },
      ]);
    },
    [removeService],
  );

  const handleSave = useCallback(() => {
    router.replace("/(partner)/settings");
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={c.white}
            />
          </Pressable>
          <Text style={styles.title}>{s.merchantServices}</Text>
          <LanguageSelector />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {services.length > 0 ? (
          <View style={styles.tableHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.columnHeader}>{s.service}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.columnHeader}>{s.price}</Text>
            </View>
          </View>
        ) : null}

        {services.length === 0 ? (
          <Text style={styles.emptyText}>{s.noServices}</Text>
        ) : (
          services.map((item) => (
            <View key={item.id} style={styles.cardRow}>
              <View style={styles.cardWrap}>
                <ServicePricingCard
                  title={item.name}
                  price={item.priceDisplay}
                  readOnly
                  containerStyle={styles.cardNoMargin}
                />
              </View>
              <View style={styles.actionsOutside}>
                <Pressable
                  onPress={() => openEdit(item)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.edit} ${item.name}`}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={22}
                    color={c.white}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.delete} ${item.name}`}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color={c.white}
                  />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.buttonRow}>
          <View style={styles.buttonRowSpacer} />
          <AppButton
            label={s.save}
            onPress={handleSave}
            variant="filled"
            style={styles.saveBtnWrap}
          />
          <View style={styles.buttonRowSpacer} />
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalCenter}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>{s.edit}</Text>
              <TextInput
                style={styles.input}
                placeholder={s.serviceNamePlaceholder}
                placeholderTextColor={c.blue500}
                value={formName}
                onChangeText={setFormName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder={s.pricePlaceholder}
                placeholderTextColor={c.blue500}
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="default"
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeModal}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.cancelBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelBtnText}>{s.cancel}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveForm}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.saveModalBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.saveModalBtnText}>{s.save}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
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
  pressed: {
    opacity: 0.8,
  },
  safeArea: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-start",
  },
  columnHeader: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    textAlign: "center",
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
    marginBottom: 20,
    textAlign: "center",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardNoMargin: {
    marginBottom: 0,
  },
  actionsOutside: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    padding: 8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  buttonRowSpacer: {
    flex: 1,
  },
  saveBtnWrap: {
    flex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCenter: {
    width: "100%",
    maxWidth: 400,
  },
  modalCard: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 20,
  },
  input: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  cancelBtnText: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  saveModalBtn: {
    backgroundColor: c.blue500,
  },
  saveModalBtnText: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.background,
  },
});
