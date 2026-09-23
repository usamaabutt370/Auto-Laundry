import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { showAppAlert } from "@/components/app-alert";
import {
  CustomerItemizedOrderLayout,
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
} from "@/components/customer-itemized-order-layout";
import { OrderSelectionSummary } from "@/components/order-selection-summary";
import { AppCtaButton } from "@/components/ui/cta-button";
import { GradientLoader } from "@/components/ui/gradient-loader";
import {
  initialDryCleanQuantities,
  type DryCleanItemDef,
} from "@/constants/dry-clean-items";
import { initialTailoringQuantities } from "@/constants/tailoring-items";
import {
  initialPressQuantities,
  initialWashFoldQuantities,
  type WashFoldItemDef,
} from "@/constants/wash-fold-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import {
  selectedServiceIdsFromQuantities,
  useCustomerOrderDraft,
} from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedPressDefs,
  listPricedTailoringDefs,
  listPricedWashFoldDefs,
  pressUnitForItem,
  tailoringUnitForItem,
  washFoldUnitForItem,
} from "@/lib/customer-order-estimate";
import { imageForServiceItem } from "@/lib/service-item-images";
import type { ServiceJob } from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";
import { UI } from "@/constants/theme";

const MAX_PHOTOS = 5;

type CatalogFamily = "washAndFold" | "dryCleaning" | "press" | "tailoring";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type BookingTile = {
  key: string;
  family: CatalogFamily;
  id: string;
  name: string;
  amount: number | null;
  priceLabel: string;
  image: number;
};

type StylePref = "standard" | "slim" | "regular" | "traditional" | "custom";
type ChoiceSide = "self" | "provider";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function namesMatch(left: string, right: string) {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(left) === normalize(right);
}

function hasQty(map: Record<string, number> | undefined) {
  return Object.values(map ?? {}).some((qty) => qty > 0);
}

type Props = {
  job: ServiceJob;
  itemLabel?: string;
};

export function ServiceBookingView({ job, itemLabel }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.bookService;
  const onboarding = getStrings(locale).partner.onboarding as Record<string, string>;

  const {
    draft,
    setSelectedServiceIds,
    setWashFoldItemizedQuantities,
    setWashFoldItemizedInstructions,
    setDryCleanItemizedQuantities,
    setDryCleanItemizedInstructions,
    setPressItemizedQuantities,
    setPressItemizedInstructions,
    setTailoringItemizedQuantities,
    setTailoringItemizedInstructions,
  } = useCustomerOrderDraft();

  const [washFoldQty, setWashFoldQty] = useState<Record<string, number>>(() => ({
    ...initialWashFoldQuantities,
    ...(draft.washFold?.itemizedQuantities ?? {}),
  }));
  const [dryCleanQty, setDryCleanQty] = useState<Record<string, number>>(() => ({
    ...initialDryCleanQuantities,
    ...(draft.dryClean?.itemizedQuantities ?? {}),
  }));
  const [pressQty, setPressQty] = useState<Record<string, number>>(() => ({
    ...initialPressQuantities,
    ...(draft.press?.itemizedQuantities ?? {}),
  }));
  const [tailoringQty, setTailoringQty] = useState<Record<string, number>>(() => ({
    ...initialTailoringQuantities,
    ...(draft.tailoring?.itemizedQuantities ?? {}),
  }));

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [stylePref, setStylePref] = useState<StylePref>("standard");
  const [measureSide, setMeasureSide] = useState<ChoiceSide>("self");
  const [fabricSide, setFabricSide] = useState<ChoiceSide>("self");
  const [notes, setNotes] = useState(() => {
    if (job === "washAndFold") return draft.washFold?.itemizedInstructions ?? "";
    if (job === "dryCleaning") return draft.dryClean?.itemizedInstructions ?? "";
    if (job === "ironing") return draft.press?.itemizedInstructions ?? "";
    return draft.tailoring?.itemizedInstructions ?? "";
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const initRef = useRef(false);

  const estimateDraft: CustomerOrderDraft = useMemo(() => {
    const washFold =
      job === "washAndFold"
        ? hasQty(washFoldQty)
          ? { itemizedQuantities: washFoldQty, itemizedInstructions: notes }
          : null
        : hasQty(draft.washFold?.itemizedQuantities)
          ? draft.washFold
          : null;
    const dryClean =
      job === "dryCleaning"
        ? hasQty(dryCleanQty)
          ? { itemizedQuantities: dryCleanQty, itemizedInstructions: notes }
          : null
        : hasQty(draft.dryClean?.itemizedQuantities)
          ? draft.dryClean
          : null;
    const press =
      job === "ironing"
        ? hasQty(pressQty)
          ? { itemizedQuantities: pressQty, itemizedInstructions: notes }
          : null
        : hasQty(draft.press?.itemizedQuantities)
          ? draft.press
          : null;
    const tailoring =
      job === "tailoring"
        ? hasQty(tailoringQty)
          ? { itemizedQuantities: tailoringQty, itemizedInstructions: notes }
          : null
        : hasQty(draft.tailoring?.itemizedQuantities)
          ? draft.tailoring
          : null;
    return {
      ...draft,
      selectedServiceIds: selectedServiceIdsFromQuantities({
        washFold: washFold?.itemizedQuantities,
        dryClean: dryClean?.itemizedQuantities,
        press: press?.itemizedQuantities,
        tailoring: tailoring?.itemizedQuantities,
      }),
      washFold,
      dryClean,
      press,
      tailoring,
    };
  }, [draft, dryCleanQty, job, notes, pressQty, tailoringQty, washFoldQty]);

  const { loading, services, estimate } = usePartnerOrderEstimate(
    draft.partnerId,
    estimateDraft,
  );

  const displayName = (id: string, fallback: string) =>
    onboarding[id]?.trim() || fallback;

  const tiles = useMemo<BookingTile[]>(() => {
    if (job === "washAndFold") {
      const wash = listPricedWashFoldDefs(services).map((def: WashFoldItemDef) => {
        const unit = washFoldUnitForItem(services, def);
        return {
          key: `washAndFold:${def.id}`,
          family: "washAndFold" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForServiceItem(def.id, def.name, "washAndFold"),
        };
      });
      return wash;
    }
    if (job === "dryCleaning") {
      return listPricedDryCleanDefs(services).map((def: DryCleanItemDef) => {
        const unit = dryCleanUnitForItem(services, def);
        return {
          key: `dryCleaning:${def.id}`,
          family: "dryCleaning" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForServiceItem(def.id, def.name, "dryCleaning"),
        };
      });
    }
    if (job === "ironing") {
      return listPricedPressDefs(services).map((def) => {
        const unit = pressUnitForItem(services, def);
        return {
          key: `press:${def.id}`,
          family: "press" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForServiceItem(def.id, def.name, "press"),
        };
      });
    }
    return listPricedTailoringDefs(services).map((def) => {
      const unit = tailoringUnitForItem(services, def);
      return {
        key: `tailoring:${def.id}`,
        family: "tailoring" as const,
        id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
        priceLabel: unit.priceLabel,
        image: imageForServiceItem(def.id, def.name, "tailoring"),
      };
    });
  }, [job, onboarding, services]);

  const qtyFor = useCallback(
    (tile: BookingTile) => {
      if (tile.family === "washAndFold") return washFoldQty[tile.id] ?? 0;
      if (tile.family === "dryCleaning") return dryCleanQty[tile.id] ?? 0;
      if (tile.family === "press") return pressQty[tile.id] ?? 0;
      return tailoringQty[tile.id] ?? 0;
    },
    [dryCleanQty, pressQty, tailoringQty, washFoldQty],
  );

  const setQtyFor = useCallback((tile: BookingTile, next: number) => {
    const value = Math.max(0, next);
    const updater = (prev: Record<string, number>) => ({ ...prev, [tile.id]: value });
    if (tile.family === "washAndFold") {
      setWashFoldQty(updater);
      return;
    }
    if (tile.family === "dryCleaning") {
      setDryCleanQty(updater);
      return;
    }
    if (tile.family === "press") {
      setPressQty(updater);
      return;
    }
    setTailoringQty(updater);
  }, []);

  useEffect(() => {
    if (initRef.current || tiles.length === 0) return;
    initRef.current = true;
    if (!itemLabel) return;
    const labeled = tiles.find(
      (tile) => namesMatch(tile.name, itemLabel) || namesMatch(tile.id, itemLabel),
    );
    if (!labeled) return;
    setSelectedKey(labeled.key);
    if (qtyFor(labeled) <= 0) setQtyFor(labeled, 1);
  }, [itemLabel, qtyFor, setQtyFor, tiles]);

  const orderedTiles = useMemo(() => {
    if (!itemLabel) return tiles;
    const matchIndex = tiles.findIndex(
      (tile) => namesMatch(tile.name, itemLabel) || namesMatch(tile.id, itemLabel),
    );
    if (matchIndex <= 0) return tiles;
    const match = tiles[matchIndex];
    return [match, ...tiles.filter((tile) => tile.key !== match.key)];
  }, [itemLabel, tiles]);

  useEffect(() => {
    if (job !== "washAndFold") return;
    setWashFoldItemizedQuantities(washFoldQty);
  }, [job, setWashFoldItemizedQuantities, washFoldQty]);

  useEffect(() => {
    if (job !== "dryCleaning") return;
    setDryCleanItemizedQuantities(dryCleanQty);
  }, [dryCleanQty, job, setDryCleanItemizedQuantities]);

  useEffect(() => {
    if (job !== "ironing") return;
    setPressItemizedQuantities(pressQty);
  }, [job, pressQty, setPressItemizedQuantities]);

  useEffect(() => {
    if (job !== "tailoring") return;
    setTailoringItemizedQuantities(tailoringQty);
  }, [job, setTailoringItemizedQuantities, tailoringQty]);

  useEffect(() => {
    setSelectedServiceIds(
      selectedServiceIdsFromQuantities({
        washFold: job === "washAndFold" ? washFoldQty : draft.washFold?.itemizedQuantities,
        dryClean: job === "dryCleaning" ? dryCleanQty : draft.dryClean?.itemizedQuantities,
        press: job === "ironing" ? pressQty : draft.press?.itemizedQuantities,
        tailoring: job === "tailoring" ? tailoringQty : draft.tailoring?.itemizedQuantities,
      }),
    );
  }, [
    draft.dryClean?.itemizedQuantities,
    draft.press?.itemizedQuantities,
    draft.tailoring?.itemizedQuantities,
    draft.washFold?.itemizedQuantities,
    dryCleanQty,
    job,
    pressQty,
    setSelectedServiceIds,
    tailoringQty,
    washFoldQty,
  ]);

  const bannerMeta =
    job === "washAndFold"
      ? { title: s.laundryBannerTitle, body: s.laundryBannerBody, highlights: [s.laundryHighlight1, s.laundryHighlight2, s.laundryHighlight3] }
      : job === "dryCleaning"
        ? { title: s.dryCleanBannerTitle, body: s.dryCleanBannerBody, highlights: [s.dryCleanHighlight1, s.dryCleanHighlight2, s.dryCleanHighlight3] }
        : job === "ironing"
          ? { title: s.ironingBannerTitle, body: s.ironingBannerBody, highlights: [s.ironingHighlight1, s.ironingHighlight2, s.ironingHighlight3] }
          : { title: s.tailoringBannerTitle, body: s.tailoringBannerBody, highlights: [s.tailoringHighlight1, s.tailoringHighlight2, s.tailoringHighlight3] };
  const instructionsPlaceholder =
    job === "dryCleaning"
      ? s.instructionsDryCleaning
      : job === "ironing"
        ? s.instructionsIroning
        : job === "tailoring"
          ? s.instructionsTailoring
          : s.instructionsLaundry;
  const addOnOptions =
    job === "ironing"
      ? [s.addOnStarch, s.addOnHanger]
      : job === "tailoring"
        ? []
        : job === "dryCleaning"
          ? [s.addOnStain, s.addOnHanger, s.addOnExpress]
          : [s.addOnStain, s.addOnSoftener, s.addOnExpress, s.addOnHanger];

  const currencyPrefix = estimate.currencyPrefix || "Rs ";

  const composeInstructions = () => {
    const parts: string[] = [];
    if (notes.trim()) parts.push(notes.trim());
    if (addOns.length > 0) parts.push(`Add-ons: ${addOns.join(", ")}`);
    if (job === "tailoring") {
      const styleLabel =
        stylePref === "slim"
          ? s.styleSlim
          : stylePref === "regular"
            ? s.styleRegular
            : stylePref === "traditional"
              ? s.styleTraditional
              : stylePref === "custom"
                ? s.styleCustom
                : s.styleStandard;
      parts.push(`${s.stylePrefs}: ${styleLabel}`);
      parts.push(
        `${s.measurements}: ${measureSide === "self" ? s.measureSelfTitle : s.measureProviderTitle}`,
      );
      parts.push(`${s.fabric}: ${fabricSide === "self" ? s.fabricSelfTitle : s.fabricProviderTitle}`);
    }
    return parts.join("\n");
  };

  const persistInstructions = (value: string) => {
    if (job === "washAndFold") {
      setWashFoldItemizedInstructions(value);
      return;
    }
    if (job === "dryCleaning") {
      setDryCleanItemizedInstructions(value);
      return;
    }
    if (job === "ironing") {
      setPressItemizedInstructions(value);
      return;
    }
    setTailoringItemizedInstructions(value);
  };

  const handleAddPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(s.addPhotos, s.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (result.canceled) return;
    const next = result.assets.map((asset) => asset.uri).filter(Boolean);
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  };

  const persistAndClose = () => {
    if (job === "washAndFold") setWashFoldItemizedQuantities(washFoldQty);
    else if (job === "dryCleaning") setDryCleanItemizedQuantities(dryCleanQty);
    else if (job === "ironing") setPressItemizedQuantities(pressQty);
    else setTailoringItemizedQuantities(tailoringQty);
    persistInstructions(composeInstructions());
    setSelectedServiceIds(estimateDraft.selectedServiceIds);
    router.back();
  };

  const changeTileQty = (tile: BookingTile, next: number) => {
    const value = Math.max(0, next);
    setQtyFor(tile, value);
    setSelectedKey(value > 0 ? tile.key : selectedKey === tile.key ? null : selectedKey);
  };

  const toggleAddOn = (label: string) => {
    setAddOns((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  };

  return (
    <View style={styles.screen}>
      <CustomerItemizedOrderLayout
        appearance="light"
        scrollContentStyle={styles.scrollContent}
        footer={
          <>
            <OrderSelectionSummary estimate={estimate} loading={loading} />
            <AppCtaButton
              label={s.done}
              onPress={persistAndClose}
              width="full"
              rightIcon="check"
              style={styles.continueBtn}
            />
          </>
        }
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {bannerMeta.title}
              </Text>
              <Text style={styles.sectionHint} numberOfLines={2}>
                {bannerMeta.body}
              </Text>
            </View>
            <Pressable
              onPress={persistAndClose}
              style={styles.roundBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={20} color={UI.text} />
            </Pressable>
          </View>

          {loading && tiles.length === 0 ? (
            <View style={styles.stateFill}>
              <GradientLoader />
            </View>
          ) : !draft.partnerId ? (
            <View style={styles.stateFill}>
              <Text style={styles.empty}>{s.noPartner}</Text>
            </View>
          ) : tiles.length === 0 ? (
            <View style={styles.stateFill}>
              <Text style={styles.empty}>{s.noRates}</Text>
            </View>
          ) : (
            <>
              <View style={styles.catalog}>
                {orderedTiles.map((tile) => {
                  const qty = qtyFor(tile);
                  const priceLine =
                    tile.amount != null
                      ? `${fill(s.fromPrice, { price: formatMoney(currencyPrefix, tile.amount) })}${s.perPiece}`
                      : tile.priceLabel !== "—"
                        ? fill(s.fromPrice, { price: tile.priceLabel })
                        : tile.priceLabel;
                  return (
                    <View key={tile.key} style={styles.serviceRow}>
                      <Image source={tile.image} style={styles.serviceImage} contentFit="cover" />
                      <View style={styles.serviceCopy}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {tile.name}
                        </Text>
                        <Text style={styles.servicePrice} numberOfLines={1}>
                          {priceLine}
                        </Text>
                        <Text style={styles.serviceDetail} numberOfLines={1}>
                          {s.numberOfPieces}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <View style={styles.qtyStepper}>
                          <Pressable
                            onPress={() => changeTileQty(tile, qty - 1)}
                            hitSlop={8}
                            style={styles.qtyStepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Decrease quantity"
                          >
                            <MaterialCommunityIcons name="minus" size={18} color={UI.text} />
                          </Pressable>
                          <Text style={styles.qtyStepperValue}>{qty}</Text>
                          <Pressable
                            onPress={() => changeTileQty(tile, qty + 1)}
                            hitSlop={8}
                            style={styles.qtyStepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Increase quantity"
                          >
                            <MaterialCommunityIcons name="plus" size={18} color={UI.purple} />
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => changeTileQty(tile, 0)}
                          disabled={qty === 0}
                          hitSlop={8}
                          style={[styles.deleteBtn, qty === 0 && styles.deleteBtnDisabled]}
                          accessibilityRole="button"
                          accessibilityLabel="Clear quantity"
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={qty === 0 ? UI.muted : UI.red}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              {addOnOptions.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.sectionTitle}>{s.addOns}</Text>
                  <Text style={styles.sectionHint}>{s.addOnsHint}</Text>
                  <View style={styles.addOnGrid}>
                    {addOnOptions.map((label) => {
                      const active = addOns.includes(label);
                      return (
                        <Pressable
                          key={label}
                          onPress={() => toggleAddOn(label)}
                          style={[styles.addOnCard, active && styles.choiceCardActive]}
                        >
                          <Text
                            style={[styles.addOnLabel, active && styles.choiceTitleActive]}
                            numberOfLines={2}
                          >
                            {label}
                          </Text>
                          {active ? (
                            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
                          ) : (
                            <View style={styles.unchecked} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {job === "tailoring" ? (
                <>
                  <View style={styles.block}>
                    <Text style={styles.sectionTitle}>{s.stylePrefs}</Text>
                    <Text style={styles.sectionHint}>{s.styleHint}</Text>
                    <View style={styles.chipWrap}>
                      {(
                        [
                          ["standard", s.styleStandard],
                          ["slim", s.styleSlim],
                          ["regular", s.styleRegular],
                          ["traditional", s.styleTraditional],
                          ["custom", s.styleCustom],
                        ] as const
                      ).map(([id, label]) => {
                        const active = stylePref === id;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => setStylePref(id)}
                            style={[styles.styleChip, active && styles.styleChipActive]}
                          >
                            {active ? (
                              <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                            ) : null}
                            <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <ChoicePair
                    title={s.measurements}
                    leftTitle={s.measureSelfTitle}
                    leftBody={s.measureSelfBody}
                    rightTitle={s.measureProviderTitle}
                    rightBody={s.measureProviderBody}
                    value={measureSide}
                    onChange={setMeasureSide}
                    leftIcon="account-outline"
                    rightIcon="account-edit-outline"
                  />
                  <ChoicePair
                    title={s.fabric}
                    leftTitle={s.fabricSelfTitle}
                    leftBody={s.fabricSelfBody}
                    rightTitle={s.fabricProviderTitle}
                    rightBody={s.fabricProviderBody}
                    value={fabricSide}
                    onChange={setFabricSide}
                    leftIcon="layers-outline"
                    rightIcon="cart-outline"
                  />
                </>
              ) : null}

              <View style={styles.block}>
                <Text style={styles.sectionTitle}>{s.instructions}</Text>
                <View style={styles.notesRow}>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={instructionsPlaceholder}
                    placeholderTextColor={UI.muted}
                    multiline
                    style={styles.notes}
                  />
                  <Pressable onPress={() => void handleAddPhotos()} style={styles.photoBtn}>
                    <MaterialCommunityIcons name="image-plus" size={20} color={UI.muted} />
                    <Text style={styles.photoBtnText}>{s.addPhotos}</Text>
                    <Text style={styles.photoCount}>
                      {fill(s.photosCount, { count: photos.length })}
                    </Text>
                  </Pressable>
                </View>
                {photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                    {photos.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </>
          )}
        </View>
      </CustomerItemizedOrderLayout>
    </View>
  );
}

function ChoicePair({
  title,
  leftTitle,
  leftBody,
  rightTitle,
  rightBody,
  value,
  onChange,
  leftIcon,
  rightIcon,
  disableLeft = false,
}: {
  title: string;
  leftTitle: string;
  leftBody: string;
  rightTitle: string;
  rightBody: string;
  value: ChoiceSide;
  onChange: (value: ChoiceSide) => void;
  leftIcon: IconName;
  rightIcon: IconName;
  disableLeft?: boolean;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.choiceGrid}>
        <Pressable
          onPress={() => onChange("self")}
          disabled={disableLeft}
          style={[
            styles.choiceCard,
            value === "self" && styles.choiceCardActive,
            disableLeft && styles.choiceDisabled,
          ]}
        >
          <MaterialCommunityIcons name={leftIcon} size={18} color={UI.purple} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.choiceTitle, value === "self" && styles.choiceTitleActive]}>
              {leftTitle}
            </Text>
            <Text style={styles.choiceBody}>{leftBody}</Text>
          </View>
          {value === "self" ? (
            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
          ) : (
            <View style={styles.unchecked} />
          )}
        </Pressable>
        <Pressable
          onPress={() => onChange("provider")}
          style={[styles.choiceCard, value === "provider" && styles.choiceCardActive]}
        >
          <MaterialCommunityIcons name={rightIcon} size={18} color={UI.purple} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.choiceTitle, value === "provider" && styles.choiceTitleActive]}>
              {rightTitle}
            </Text>
            <Text style={styles.choiceBody}>{rightBody}</Text>
          </View>
          {value === "provider" ? (
            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
          ) : (
            <View style={styles.unchecked} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.card },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, color: UI.text, fontFamily: "Poppins-Bold" },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    flex: 1,
    backgroundColor: UI.card,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  stateFill: {
    flexGrow: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  catalog: { gap: 10 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    backgroundColor: UI.card,
    padding: 10,
  },
  serviceImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: UI.iconWell },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceName: { fontSize: 14, color: UI.text, fontFamily: "Poppins-SemiBold" },
  servicePrice: { marginTop: 4, fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  serviceDetail: { marginTop: 2, fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular" },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 108,
    height: 44,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.redBg,
  },
  deleteBtnDisabled: {
    backgroundColor: UI.iconWell,
  },
  qtyStepperBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyStepperValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    color: UI.text,
    fontFamily: "Poppins-Bold",
  },
  sectionTitle: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  sectionHint: { marginTop: 2, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  block: { gap: 8 },
  addOnGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addOnCard: {
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "49%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: UI.card,
  },
  addOnLabel: { flex: 1, fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
  choiceGrid: { gap: 8 },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    padding: 12,
    backgroundColor: UI.card,
  },
  choiceCardActive: { borderColor: UI.purple, backgroundColor: "#F5F3FF" },
  choiceDisabled: { opacity: 0.45 },
  choiceTitle: { fontSize: 13, color: UI.text, fontFamily: "Poppins-SemiBold" },
  choiceTitleActive: { color: UI.purple },
  choiceBody: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular", marginTop: 2 },
  unchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  styleChipActive: { backgroundColor: UI.purple, borderColor: UI.purple },
  styleChipText: { fontSize: 12, color: UI.text, fontFamily: "Poppins-Medium" },
  styleChipTextActive: { color: "#FFFFFF" },
  notesRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  notes: {
    flex: 1,
    minHeight: 84,
    maxHeight: CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI.text,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    textAlignVertical: "top",
  },
  photoBtn: {
    width: 84,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: UI.card,
  },
  photoBtnText: { fontSize: 10, color: UI.muted, fontFamily: "Poppins-Medium", textAlign: "center" },
  photoCount: { fontSize: 10, color: UI.muted, fontFamily: "Poppins-Regular" },
  photoRow: { gap: 8, paddingTop: 4 },
  photoThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: UI.iconWell },
  empty: {
    textAlign: "center",
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  continueBtn: { marginTop: 4, marginBottom: 8 },
});
