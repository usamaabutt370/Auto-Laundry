import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { PartnerHeader } from "@/components/partner-header";
import { ServicePricingCard } from "@/components/service-pricing-card";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

/** Screen 1: Main Merchant Services – read-only list, Add Service → Screen 2, Edit/Rename → Screen 3. */
export default function SettingsIndexScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.settings;
  const { services, isLoadingServices } = useMerchantServices();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.merchantServices}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          rightElement={<LanguageSelector />}
          leftAccessibilityLabel="Go back"
        />
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

        {isLoadingServices ? (
          <Text style={styles.emptyText}>{s.loading}</Text>
        ) : services.length === 0 ? (
          <Text style={styles.emptyText}>{s.noServices}</Text>
        ) : (
          services.map((item) => (
            <ServicePricingCard
              key={item.id}
              title={item.name}
              price={item.priceDisplay}
              readOnly
            />
          ))
        )}

        <View style={styles.buttonRow}>
          <AppButton
            label={s.addService}
            onPress={() => router.push("/(partner)/settings/add-service")}
            variant="filled"
            leftIcon="plus"
            fullWidth
          />
          <AppButton
            label={s.editRemoveService}
            onPress={() => router.push("/(partner)/settings/edit-service")}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    marginBottom: 20,
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
    alignItems: "flex-end",
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
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
});
