import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { SignInRequiredModal } from "@/components/sign-in-required-modal";
import { AppCtaButton } from "@/components/ui/cta-button";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { useAuth } from "@/contexts/auth-context";
import {
  selectedServiceIdsFromQuantities,
  useCustomerOrderDraft,
  type CustomerOrderDraft,
} from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { updateCustomerOrder } from "@/lib/customer-order-edit";
import { submitCustomerOrder } from "@/lib/customer-order-submit";
import { imageForServiceItem } from "@/lib/service-item-images";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ServiceJob } from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { getDeviceCoordinates } from "@/utils/device-location";
import { formatMoney } from "@/utils/format-money";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerHoursRange, getPartnerOpenStatus } from "@/utils/partner-hours";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";
import { requestLaundererCollectFocus } from "@/utils/launderer-detail-focus";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { UI } from "@/constants/theme";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function goToAuthFromOrderSummary(
  router: ReturnType<typeof useRouter>,
  pathname: "/(auth)/login" | "/(auth)/sign-up",
) {
  router.push({
    pathname,
    params: { returnTo: "order-summary" },
  });
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number) {
  if (km < 1) return `${Math.max(0.1, km).toFixed(1)} km`;
  return `${km.toFixed(1)} km`;
}

function parseQty(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function displayServiceTitle(title: string) {
  return title
    .replace(/^wash\s*&\s*fold\s*-\s*/i, "")
    .replace(/^dry\s*cleaning\s*-\s*/i, "")
    .replace(/^press\s*-\s*/i, "")
    .replace(/^tailoring\s*-\s*/i, "")
    .trim();
}

function parseLineKey(key: string): { job: ServiceJob; id: string } | null {
  if (key.startsWith("wash_fold_")) return { job: "washAndFold", id: key.slice("wash_fold_".length) };
  if (key.startsWith("dry_")) return { job: "dryCleaning", id: key.slice("dry_".length) };
  if (key.startsWith("press_")) return { job: "ironing", id: key.slice("press_".length) };
  if (key.startsWith("tailoring_")) return { job: "tailoring", id: key.slice("tailoring_".length) };
  return null;
}

function familyInstructions(draft: CustomerOrderDraft, job: ServiceJob) {
  if (job === "washAndFold") return draft.washFold?.itemizedInstructions ?? "";
  if (job === "dryCleaning") return draft.dryClean?.itemizedInstructions ?? "";
  if (job === "ironing") return draft.press?.itemizedInstructions ?? "";
  return draft.tailoring?.itemizedInstructions ?? "";
}

function parseAddOns(instructions: string) {
  const match = instructions.match(/Add-ons:\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function notesWithoutAddOns(instructions: string) {
  return instructions
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^Add-ons:/i.test(line))
    .join("\n");
}

const JOB_ORDER: ServiceJob[] = ["washAndFold", "dryCleaning", "ironing", "tailoring"];

export default function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { isNarrow } = useResponsiveLayout();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { draft, editingOrderId, resetDraft, setSelectedServiceIds, setWashFoldItemizedQuantities, setDryCleanItemizedQuantities, setPressItemizedQuantities, setTailoringItemizedQuantities } =
    useCustomerOrderDraft();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signInPromptVisible, setSignInPromptVisible] = useState(false);
  const [customerAddress, setCustomerAddress] = useState("");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const isEditing = Boolean(editingOrderId);
  const s = getStrings(locale).customer.orderSummary;
  const sHome = getStrings(locale).customer.home;
  const sheetHeight = Math.round(height * 0.9);
  const footerBottom = Math.max(insets.bottom, 12);

  const close = () => router.back();

  const partnerVerified = usePartnerVerified(draft.partnerId);
  const { loading, error, estimate, profile, services, reload } = usePartnerOrderEstimate(
    draft.partnerId,
    draft,
  );

  useEffect(() => {
    void getDeviceCoordinates().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user?.id || !isSupabaseConfigured() || !supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .maybeSingle<{ address: string | null }>();
      if (!cancelled) setCustomerAddress(data?.address?.trim() ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSubmitOrder = async () => {
    const fail = (title: string, message: string) => {
      setSubmitError(message);
      showAppAlert(title, message);
      Alert.alert(title, message);
    };

    if (!user?.id) {
      setSignInPromptVisible(true);
      return;
    }
    if (!draft.partnerId) {
      fail("No Laundry Captain selected", "Please select a Laundry Captain first.");
      return;
    }
    if (draft.selectedServiceIds.length === 0) {
      fail("No services selected", "Please select at least one service.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEditing && editingOrderId) {
        const result = await updateCustomerOrder({
          customerId: user.id,
          orderId: editingOrderId,
          draft,
          estimate,
          services,
        });
        if (!result.ok) {
          fail("Unable to save changes", result.error || "Unknown error while saving.");
          return;
        }
        const savedOrderId = editingOrderId;
        resetDraft();
        showAppAlert(s.orderUpdated, s.orderUpdatedMessage, [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/(customer)/order-detail",
                params: { orderId: savedOrderId },
              }),
          },
        ]);
        return;
      }

      const result = await submitCustomerOrder({
        customerId: user.id,
        draft,
        estimate,
        profile,
        services,
      });
      if (!result.ok) {
        const message = result.error || "Unknown error while submitting.";
        fail("Unable to submit order", message);
        return;
      }
      router.replace({
        pathname: "/(customer)/order-confirmation",
        params: { orderId: result.orderId },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while submitting.";
      fail("Unable to submit order", message);
    } finally {
      setSubmitting(false);
    }
  };

  const serviceLines = useMemo(
    () => estimate.lines.filter((line) => line.key !== "pickup_delivery"),
    [estimate.lines],
  );
  const groupedServices = useMemo(() => {
    return JOB_ORDER.flatMap((job) => {
      const lines = serviceLines.filter((line) => (parseLineKey(line.key)?.job ?? "washAndFold") === job);
      return lines.length > 0 ? [{ job, lines }] : [];
    });
  }, [serviceLines]);
  const pickupLine = useMemo(
    () => estimate.lines.find((line) => line.key === "pickup_delivery"),
    [estimate.lines],
  );
  const pickupFeeDisplay = useMemo(() => {
    if (pickupLine?.amount != null) {
      return formatMoney(estimate.currencyPrefix, pickupLine.amount);
    }
    const raw = profile?.pickup_delivery_amount?.trim();
    if (!raw) return "—";
    return raw;
  }, [estimate.currencyPrefix, pickupLine?.amount, profile?.pickup_delivery_amount]);

  const servicesTotal = useMemo(
    () => serviceLines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
    [serviceLines],
  );
  const totalDisplay =
    estimate.total != null
      ? formatMoney(estimate.currencyPrefix, estimate.total)
      : estimate.partialTotal > 0
        ? `${formatMoney(estimate.currencyPrefix, estimate.partialTotal)} *`
        : "—";

  const partnerName = profile?.business_name?.trim() || draft.partnerName || "";
  const partnerImage =
    (Array.isArray(profile?.business_images)
      ? profile.business_images.find((item): item is string => typeof item === "string" && item.trim().length > 0)
      : null) || avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);
  const openStatus = getPartnerOpenStatus(profile?.available_time);
  const hours = getPartnerHoursRange(profile?.available_time);
  const partnerCoords =
    profile && Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
      : null;
  const distanceLabel =
    userCoords && partnerCoords ? formatKm(distanceKm(userCoords, partnerCoords)) : null;
  const ratingAvg = profile?.ratingAvg;
  const ratingCount = profile?.ratingCount ?? 0;
  const ratingLabel =
    ratingAvg != null && Number.isFinite(ratingAvg)
      ? Number.isInteger(ratingAvg)
        ? String(ratingAvg)
        : ratingAvg.toFixed(1)
      : null;

  const combinedNotes = useMemo(() => {
    const chunks = [
      notesWithoutAddOns(draft.washFold?.itemizedInstructions ?? ""),
      notesWithoutAddOns(draft.dryClean?.itemizedInstructions ?? ""),
      notesWithoutAddOns(draft.press?.itemizedInstructions ?? ""),
      notesWithoutAddOns(draft.tailoring?.itemizedInstructions ?? ""),
    ].filter(Boolean);
    return Array.from(new Set(chunks)).join("\n");
  }, [draft.dryClean?.itemizedInstructions, draft.press?.itemizedInstructions, draft.tailoring?.itemizedInstructions, draft.washFold?.itemizedInstructions]);

  const scheduleLabel = useMemo(() => {
    if (!draft.pickupDeliveryRequested) return null;
    const pickup = draft.pickup;
    if (!pickup) return s.noSchedule;
    const day = pickup.dayLabel || pickup.dateIso;
    return `${day}${pickup.timeSlotLabel ? `\n${pickup.timeSlotLabel}` : ""}`;
  }, [draft.pickup, draft.pickupDeliveryRequested, s.noSchedule]);

  const categoryLabel = (job: ServiceJob) => {
    if (job === "dryCleaning") return sHome.categoryDryCleaning;
    if (job === "ironing") return sHome.categoryIroning;
    if (job === "tailoring") return sHome.categoryTailoring;
    return sHome.categoryLaundry;
  };

  const openBookService = (job: ServiceJob) => {
    if (!draft.partnerId) return;
    router.push({
      pathname: "/(customer)/book-service",
      params: {
        job,
        partnerId: draft.partnerId,
        ...(draft.partnerName ? { partnerName: draft.partnerName } : {}),
      },
    });
  };

  const openShop = (options?: { focus?: "collect" }) => {
    if (!draft.partnerId) return;
    if (options?.focus === "collect") {
      requestLaundererCollectFocus();
    }
    // Close review so the user lands on the existing launderer detail (add services / view provider).
    try {
      if (typeof router.canDismiss === "function" && router.canDismiss()) {
        router.dismiss();
        return;
      }
    } catch {
      // ignore
    }
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate({
      pathname: "/(customer)/launderer-detail",
      params: {
        id: draft.partnerId,
        ...(draft.partnerName ? { name: draft.partnerName } : {}),
        mode: draft.pickupDeliveryRequested ? "pickupDelivery" : "dropoff",
        ...(options?.focus ? { focus: options.focus } : {}),
      },
    });
  };

  const openPickupSchedule = () => {
    router.push({
      pathname: "/(customer)/schedule-pickup",
      params: { from: "review" },
    });
  };

  /** Drop-off Change: close review and return to detail so user can pick fulfillment. */
  const changeFulfillmentFromReview = () => {
    if (!draft.partnerId) return;
    if (draft.pickupDeliveryRequested) {
      openPickupSchedule();
      return;
    }
    requestLaundererCollectFocus();
    try {
      if (typeof router.canDismiss === "function" && router.canDismiss()) {
        router.dismiss();
        return;
      }
    } catch {
      // ignore
    }
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate({
      pathname: "/(customer)/launderer-detail",
      params: {
        id: draft.partnerId,
        ...(draft.partnerName ? { name: draft.partnerName } : {}),
        mode: "dropoff",
        focus: "collect",
      },
    });
  };

  const removeLine = (key: string) => {
    const parsed = parseLineKey(key);
    if (!parsed) return;
    const zeroOut = (current: Record<string, number> | undefined) => ({
      ...(current ?? {}),
      [parsed.id]: 0,
    });
    if (parsed.job === "washAndFold") {
      const next = zeroOut(draft.washFold?.itemizedQuantities);
      setWashFoldItemizedQuantities(next);
      setSelectedServiceIds(
        selectedServiceIdsFromQuantities({
          washFold: next,
          dryClean: draft.dryClean?.itemizedQuantities,
          press: draft.press?.itemizedQuantities,
          tailoring: draft.tailoring?.itemizedQuantities,
        }),
      );
      return;
    }
    if (parsed.job === "dryCleaning") {
      const next = zeroOut(draft.dryClean?.itemizedQuantities);
      setDryCleanItemizedQuantities(next);
      setSelectedServiceIds(
        selectedServiceIdsFromQuantities({
          washFold: draft.washFold?.itemizedQuantities,
          dryClean: next,
          press: draft.press?.itemizedQuantities,
          tailoring: draft.tailoring?.itemizedQuantities,
        }),
      );
      return;
    }
    if (parsed.job === "ironing") {
      const next = zeroOut(draft.press?.itemizedQuantities);
      setPressItemizedQuantities(next);
      setSelectedServiceIds(
        selectedServiceIdsFromQuantities({
          washFold: draft.washFold?.itemizedQuantities,
          dryClean: draft.dryClean?.itemizedQuantities,
          press: next,
          tailoring: draft.tailoring?.itemizedQuantities,
        }),
      );
      return;
    }
    const next = zeroOut(draft.tailoring?.itemizedQuantities);
    setTailoringItemizedQuantities(next);
    setSelectedServiceIds(
      selectedServiceIdsFromQuantities({
        washFold: draft.washFold?.itemizedQuantities,
        dryClean: draft.dryClean?.itemizedQuantities,
        press: draft.press?.itemizedQuantities,
        tailoring: next,
      }),
    );
  };

  const submitDisabled = !draft.partnerId || loading || Boolean(error) || submitting || serviceLines.length === 0;
  const submitLabel = submitting
    ? isEditing
      ? "Saving..."
      : "Submitting..."
    : isEditing
      ? s.saveChanges
      : s.continueToPayment;

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.dismiss}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.roundBtn} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isEditing ? s.editTitle : s.title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {s.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={close}
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!draft.partnerId ? (
          <View style={styles.centerBlock}>
            <Text style={styles.muted}>{s.selectLaundererFirst}</Text>
            <Pressable
              onPress={() => router.replace("/(customer)/pick-launderer")}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>{s.pickLaunderer}</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.centerBlock}>
            <GradientLoader />
          </View>
        ) : error ? (
          <View style={styles.centerBlock}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={reload} style={styles.linkBtn}>
              <Text style={styles.linkText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {isEditing ? <Text style={styles.lockedPartnerNote}>{s.lockedLaundererNote}</Text> : null}

            <View style={styles.card}>
              <View style={styles.providerRow}>
                {partnerImage ? (
                  <Image
                    source={{ uri: partnerImage }}
                    style={[
                      styles.providerImage,
                      isNarrow && styles.providerImageNarrow,
                    ]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.providerImage,
                      isNarrow && styles.providerImageNarrow,
                      styles.providerImageFallback,
                    ]}
                  />
                )}
                <View style={styles.providerCopy}>
                  <PartnerNameWithBadge
                    name={partnerName}
                    verified={partnerVerified}
                    nameStyle={styles.providerName}
                    badgeSize={14}
                  />
                  <View style={styles.metaRow}>
                    {ratingLabel ? (
                      <>
                        <MaterialCommunityIcons name="star" size={13} color="#F5B301" />
                        <Text style={styles.metaStrong}>{ratingLabel}</Text>
                        {ratingCount > 0 ? (
                          <Text style={styles.metaMuted}>{fill(s.reviewsCount, { count: ratingCount })}</Text>
                        ) : null}
                        <Text style={styles.metaDot}>•</Text>
                      </>
                    ) : null}
                    <Text
                      style={[
                        styles.openText,
                        openStatus === "closed" && styles.closedText,
                        openStatus === "unknown" && styles.metaMuted,
                      ]}
                    >
                      {openStatus === "open" ? s.openNow : openStatus === "closed" ? s.closedNow : ""}
                    </Text>
                    {hours?.endLabel ? (
                      <Text style={styles.metaMuted}>
                        {" "}
                        {fill(openStatus === "closed" ? s.opensAt : s.closesAt, { time: hours.endLabel })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.providerFooter}>
                    {distanceLabel ? (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.purple} />
                        <Text style={styles.metaMuted}>{distanceLabel}</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <Pressable onPress={openShop} hitSlop={8} style={styles.inlineLink}>
                      <Text style={styles.inlineLinkText}>{s.viewProvider}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={UI.purple} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  {s.yourServices} ({serviceLines.length})
                </Text>
                <Pressable onPress={openShop} hitSlop={8} style={styles.inlineLink}>
                  <MaterialCommunityIcons name="plus" size={16} color={UI.purple} />
                  <Text style={styles.inlineLinkText}>{s.addAnotherService}</Text>
                </Pressable>
              </View>
              {groupedServices.map((group, groupIndex) => {
                const addOns = parseAddOns(familyInstructions(draft, group.job));
                return (
                  <View
                    key={group.job}
                    style={[
                      styles.categoryGroup,
                      groupIndex < groupedServices.length - 1 && styles.categoryGroupBorder,
                    ]}
                  >
                    <View style={styles.categoryHead}>
                      <Text style={styles.categoryTitle}>{categoryLabel(group.job)}</Text>
                      <Pressable onPress={() => openBookService(group.job)} hitSlop={8}>
                        <Text style={styles.inlineLinkText}>{s.edit}</Text>
                      </Pressable>
                    </View>
                    {group.lines.map((line, index) => {
                      const parsed = parseLineKey(line.key);
                      const qty = parseQty(line.qtyLabel);
                      const unit = line.amount != null && qty > 0 ? line.amount / qty : null;
                      return (
                        <View
                          key={line.key}
                          style={[
                            styles.serviceBlock,
                            index < group.lines.length - 1 && styles.serviceBlockBorder,
                          ]}
                        >
                          <View style={styles.serviceRow}>
                            <Image
                              source={imageForServiceItem(parsed?.id, line.title, group.job)}
                              style={[
                                styles.serviceImage,
                                isNarrow && styles.serviceImageNarrow,
                              ]}
                              contentFit="cover"
                            />
                            <View style={styles.serviceCopy}>
                              <Text style={styles.serviceName} numberOfLines={2}>
                                {displayServiceTitle(line.title)}
                              </Text>
                              {unit != null ? (
                                <Text style={styles.unitPrice}>
                                  {formatMoney(estimate.currencyPrefix, unit)}
                                  {s.perPiece}
                                </Text>
                              ) : null}
                              <View style={styles.serviceMetaRow}>
                                <Text style={styles.metaMuted}>{fill(s.pieces, { count: qty || 1 })}</Text>
                                <View style={styles.serviceActions}>
                                  <Text style={styles.lineTotal}>
                                    {line.amount != null
                                      ? formatMoney(estimate.currencyPrefix, line.amount)
                                      : "—"}
                                  </Text>
                                  <Pressable
                                    onPress={() => removeLine(line.key)}
                                    hitSlop={8}
                                    accessibilityLabel="Remove"
                                  >
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={UI.muted} />
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                    {addOns.map((addon) => (
                      <View key={`${group.job}-${addon}`} style={styles.addonRow}>
                        <MaterialCommunityIcons name="leaf" size={14} color={UI.teal} />
                        <Text style={styles.addonText}>{addon}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialCommunityIcons
                    name={draft.pickupDeliveryRequested ? "truck-delivery-outline" : "storefront-outline"}
                    size={18}
                    color={UI.purple}
                  />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>
                    {draft.pickupDeliveryRequested ? s.pickupDelivery : s.dropoffTitle}
                  </Text>
                  <Text style={styles.infoBody}>
                    {draft.pickupDeliveryRequested ? s.pickupHint : s.dropoffHint}
                  </Text>
                </View>
                <Pressable onPress={changeFulfillmentFromReview} hitSlop={8}>
                  <Text style={styles.inlineLinkText}>{s.change}</Text>
                </Pressable>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={UI.purple} />
                </View>
                <Text style={[styles.infoBody, styles.infoCopy]}>{customerAddress || s.noAddress}</Text>
              </View>

              {draft.pickupDeliveryRequested ? (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={18} color={UI.purple} />
                    </View>
                    <Text style={[styles.infoBody, styles.infoCopy]}>{scheduleLabel}</Text>
                  </View>
                </>
              ) : null}

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialCommunityIcons name="text-box-outline" size={18} color={UI.purple} />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>{s.specialInstructions}</Text>
                  <Text style={styles.infoBody}>{combinedNotes || s.noInstructions}</Text>
                </View>
                <Pressable
                  onPress={() => openBookService(parseLineKey(serviceLines[0]?.key ?? "")?.job ?? "washAndFold")}
                  hitSlop={8}
                >
                  <Text style={styles.inlineLinkText}>{s.edit}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.sectionTitle}>{s.priceDetails}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{fill(s.servicesCount, { count: serviceLines.length })}</Text>
                <Text style={styles.priceValue}>
                  {formatMoney(estimate.currencyPrefix, servicesTotal)}
                </Text>
              </View>
              {draft.pickupDeliveryRequested ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{s.pickupDeliveryFee}</Text>
                  <Text style={styles.priceValue}>{pickupFeeDisplay}</Text>
                </View>
              ) : null}
              <View style={styles.priceTotalRow}>
                <Text style={styles.priceTotalLabel}>{s.total}</Text>
                <Text style={styles.priceTotalValue}>{totalDisplay}</Text>
              </View>
              {estimate.disclaimer ? <Text style={styles.disclaimer}>{estimate.disclaimer}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <AppCtaButton
          label={submitLabel}
          onPress={handleSubmitOrder}
          disabled={submitDisabled}
          loading={submitting}
          width="full"
          rightIcon={isEditing ? undefined : "arrow-right"}
        />
      </View>

      <SignInRequiredModal
        visible={signInPromptVisible}
        onClose={() => setSignInPromptVisible(false)}
        onSignIn={() => {
          goToAuthFromOrderSummary(router, "/(auth)/login");
          setTimeout(() => setSignInPromptVisible(false), 500);
        }}
        onSignUp={() => {
          goToAuthFromOrderSummary(router, "/(auth)/sign-up");
          setTimeout(() => setSignInPromptVisible(false), 500);
        }}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: UI.bg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 },
  centerBlock: { paddingVertical: 40, alignItems: "center", gap: 12 },
  lockedPartnerNote: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  providerRow: { flexDirection: "row", gap: 12 },
  providerImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: UI.iconWell },
  providerImageNarrow: { width: 48, height: 48, borderRadius: 12 },
  providerImageFallback: { backgroundColor: "#EDE9FE" },
  providerCopy: { flex: 1, minWidth: 0, gap: 4 },
  providerName: { fontSize: 16, fontFamily: "Poppins-Bold", color: UI.text },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  metaStrong: { fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
  metaMuted: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  metaDot: { color: UI.muted, fontSize: 12 },
  openText: { fontSize: 12, color: UI.open, fontFamily: "Poppins-SemiBold" },
  closedText: { color: UI.closed },
  providerFooter: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  inlineLinkText: { fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  categoryGroup: { paddingTop: 4 },
  categoryGroupBorder: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  categoryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 2,
  },
  categoryTitle: { fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  serviceBlock: { paddingVertical: 10, gap: 8 },
  serviceBlockBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: UI.chipBorder },
  serviceRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  serviceImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: UI.iconWell },
  serviceImageNarrow: { width: 44, height: 44, borderRadius: 10 },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  serviceName: { flex: 1, fontSize: 15, color: UI.text, fontFamily: "Poppins-SemiBold" },
  unitPrice: { marginTop: 4, fontSize: 12, color: UI.purple, fontFamily: "Poppins-Medium" },
  serviceMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineTotal: { fontSize: 15, color: UI.text, fontFamily: "Poppins-Bold" },
  addonRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4 },
  addonText: { fontSize: 12, color: UI.teal, fontFamily: "Poppins-Medium" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: { flex: 1, minWidth: 0 },
  infoTitle: { fontSize: 14, color: UI.text, fontFamily: "Poppins-SemiBold" },
  infoBody: { fontSize: 13, color: UI.muted, fontFamily: "Poppins-Regular", lineHeight: 19 },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: UI.chipBorder, marginVertical: 12 },
  priceCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    gap: 10,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, color: UI.muted, fontFamily: "Poppins-Regular" },
  priceValue: { fontSize: 13, color: UI.text, fontFamily: "Poppins-SemiBold" },
  priceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DDD6FE",
  },
  priceTotalLabel: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  priceTotalValue: { fontSize: 18, color: UI.text, fontFamily: "Poppins-Bold" },
  disclaimer: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular", lineHeight: 16 },
  muted: { color: UI.muted, textAlign: "center", fontFamily: "Poppins-Regular" },
  error: { color: "#B91C1C", textAlign: "center", fontFamily: "Poppins-Regular" },
  linkBtn: { padding: 12 },
  linkText: { color: UI.teal, fontFamily: "Poppins-SemiBold", fontSize: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  submitError: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
    marginBottom: 10,
    textAlign: "center",
  },
});
