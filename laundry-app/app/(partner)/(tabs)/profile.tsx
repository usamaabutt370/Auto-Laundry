import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { subscribeProfileAvatarUpdated } from "@/lib/profile-avatar-refresh";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { awardWelcomeCredits } from "@/lib/partner-credits";
import { showAppAlert } from "@/components/app-alert";
import { AvatarImage } from "@/components/avatar-image";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import { GradientSwitch } from "@/components/ui/gradient-switch";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";
import { UI } from "@/constants/theme";

const WHATSAPP_PHONE = "923004639943";

function buildWhatsAppUrl(name: string, balance: number | null): string {
	const message = `Hello! I am ${name} and I would like to buy credits. My current balance is ${balance?.toLocaleString() ?? 0} credits.`;
	return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export default function PartnerProfileMenu() {
	const router = useRouter();
	const { locale } = useLocale();
	const copy = getStrings(locale).partner.profileScreen;
	const signOutCopy = getStrings(locale).customer.profileTab;
	const { user, signOut, refreshRole } = useAuth();
	const { isWeb } = useResponsiveLayout();
	const isFocused = useIsFocused();
	const insets = useSafeAreaInsets();
	useSuppressWebScreenHeader();

	const [isUpdatingRole, setIsUpdatingRole] = useState(false);
	const [roleSwitchValue, setRoleSwitchValue] = useState<boolean | null>(null);
	const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
	const [displayName, setDisplayName] = useState<string>("Service Provider");
	const [displayPhone, setDisplayPhone] = useState<string>("");
	const [displayAddress, setDisplayAddress] = useState<string>("");
	const [creditBalance, setCreditBalance] = useState<number | null>(null);

	const fetchProfile = useCallback(async () => {
		if (!isSupabaseConfigured() || !user?.id) return;
		try {
			const { data, error } = await supabase
				.from("partner_profiles")
				.select("image_url,updated_at,status,address,business_images")
				.eq("id", user.id)
				.maybeSingle();
			const { data: profileData } = await supabase
				.from("profiles")
				.select("full_name,first_name,last_name,phone,image_url,updated_at")
				.eq("id", user.id)
				.maybeSingle<{
					full_name: string | null;
					first_name: string | null;
					last_name: string | null;
					phone: string | null;
					image_url: string | null;
					updated_at: string | null;
				}>();

			const resolvedName =
				(profileData?.full_name ?? "").trim() ||
				[profileData?.first_name ?? "", profileData?.last_name ?? ""].join(" ").trim() ||
				user?.user_metadata?.full_name ||
				user?.user_metadata?.first_name ||
				"Service Provider";
			setDisplayName(resolvedName);
			setDisplayPhone(profileData?.phone ?? (user?.user_metadata as any)?.phone ?? "");

			const businessImages = Array.isArray(data?.business_images) ? data.business_images : [];
			const businessImage = businessImages.find(
				(item): item is string => typeof item === "string" && item.trim().length > 0,
			);
			const partnerImage = businessImage?.trim()
				|| avatarUrlWithCacheBuster(data?.image_url, data?.updated_at);
			const profileImage = profileData
				? avatarUrlWithCacheBuster(profileData.image_url, profileData.updated_at)
				: undefined;
			setAvatarUri(partnerImage || profileImage);
			setDisplayAddress(error || !data ? "" : (data.address ?? "").trim());
		} catch {
			// ignore and leave placeholder
		}

		try {
			const { data: creditData } = await supabase
				.from("partner_credit_accounts")
				.select("balance")
				.eq("partner_id", user.id)
				.maybeSingle();

			if (creditData) {
				setCreditBalance(creditData.balance as number);
			} else {
				// No account yet — if KYC is approved, self-award welcome credits now
				const { data: partnerData } = await supabase
					.from("partner_profiles")
					.select("status")
					.eq("id", user.id)
					.maybeSingle();
				if ((partnerData as any)?.status === "approved") {
					const result = await awardWelcomeCredits().catch(() => null);
					setCreditBalance(result?.balance ?? null);
				} else {
					setCreditBalance(null);
				}
			}
		} catch {
			// ignore
		}
	}, [user?.id]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	useFocusEffect(
		useCallback(() => {
			fetchProfile();
		}, [fetchProfile])
	);

	useEffect(() => {
		if (isFocused) {
			void fetchProfile();
		}
	}, [isFocused, fetchProfile]);

	useEffect(() => {
		return subscribeProfileAvatarUpdated(() => {
			void fetchProfile();
		});
	}, [fetchProfile]);

	const handleRoleToggle = async (value: boolean) => {
		if (!user?.id || !isSupabaseConfigured() || isUpdatingRole) return;
		setRoleSwitchValue(value);
		setIsUpdatingRole(true);
		try {
			const newRole = value ? "launderer" : "customer";
			const { error } = await supabase
				.from("profiles")
				.update({ role: newRole, updated_at: new Date().toISOString() })
				.eq("id", user.id);
			if (error) throw error;
			await refreshRole();
			const delayMs = 320;
			await new Promise((r) => setTimeout(r, delayMs));
			router.replace(value ? "/(partner)" : "/(customer)");
		} catch (err) {
			setRoleSwitchValue(!value);
			const message = err instanceof Error ? err.message : "Could not update role.";
			showAppAlert("Error", message);
		} finally {
			setIsUpdatingRole(false);
		}
	};

	const isPartnerSwitchOn = roleSwitchValue !== null ? roleSwitchValue : (user?.user_metadata?.role ?? "launderer") === "launderer";
	const openEditProfile = () => router.push("/(partner)/laundrerinfo");

	return (
		<View style={[styles.container, { paddingTop: isWeb ? 0 : insets.top }]}>
			<StatusBar style="dark" />
			{isWeb ? <WebHeaderSpacer /> : null}
			<ScrollView
				contentContainerStyle={[
					styles.content,
					isWeb && styles.contentWeb,
					{ paddingBottom: getTabBarBottomInset(Math.max(insets.bottom, 8)) + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<View style={styles.headerText}>
						<Text style={styles.headerTitle}>{copy.title}</Text>
						<Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
					</View>
					<Pressable
						onPress={() => router.push("/(customer)/settings")}
						style={({ pressed }) => [styles.gearBtn, pressed && styles.pressed]}
						accessibilityRole="button"
						accessibilityLabel={copy.settingsA11y}
					>
						<MaterialCommunityIcons name="cog-outline" size={22} color={UI.text} />
					</Pressable>
				</View>

				<View style={styles.card}>
					<View style={styles.profileRow}>
						<Pressable onPress={openEditProfile} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel={copy.editPhotoA11y}>
							<AvatarImage uri={avatarUri} name={displayName} size={72} style={styles.avatar} />
							<View style={styles.cameraBadge}>
								<MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
							</View>
						</Pressable>
						<View style={styles.profileBody}>
							<View style={styles.nameRow}>
								<Text style={styles.name} numberOfLines={1}>{displayName}</Text>
								<Pressable
									onPress={openEditProfile}
									style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
									accessibilityRole="button"
									accessibilityLabel={copy.editProfile}
								>
									<MaterialCommunityIcons name="pencil-outline" size={14} color="#2563EB" />
									<Text style={styles.editBtnText}>{copy.editProfile}</Text>
								</Pressable>
							</View>
							{displayPhone ? (
								<View style={styles.contactRow}>
									<MaterialCommunityIcons name="phone-outline" size={14} color="#2563EB" />
									<Text style={styles.contactText} numberOfLines={1}>{displayPhone}</Text>
								</View>
							) : null}
							{displayAddress ? (
								<View style={[styles.contactRow, styles.addressRow]}>
									<MaterialCommunityIcons name="map-marker-outline" size={14} color="#2563EB" style={styles.addressIcon} />
									<Text style={styles.contactText} numberOfLines={2}>{displayAddress}</Text>
								</View>
							) : null}
						</View>
					</View>
				</View>

				<Pressable
					onPress={() => router.push("/(partner)/business-detail")}
					style={({ pressed }) => [pressed && styles.pressed]}
					accessibilityRole="button"
					accessibilityLabel={copy.myStore}
				>
					<LinearGradient
						colors={["#F7FBFF", "#E4F0FF"]}
						start={{ x: 0, y: 0.5 }}
						end={{ x: 1, y: 0.5 }}
						style={styles.storeCard}
					>
						<View style={styles.storeIconWell}>
							<MaterialCommunityIcons name="storefront" size={22} color="#2563EB" />
						</View>
						<View style={styles.rowBody}>
							<Text style={styles.rowTitle}>{copy.myStore}</Text>
							<Text style={styles.rowSubtitle}>{copy.myStoreHint}</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={22} color="#60A5FA" />
					</LinearGradient>
				</Pressable>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>{copy.business}</Text>
					<Text style={styles.sectionSubtitle}>{copy.businessHint}</Text>
					{creditBalance !== null ? (
						<View style={styles.creditRow}>
							<View style={[styles.iconWell, { backgroundColor: "#FEF3C7" }]}>
								<MaterialCommunityIcons name="wallet-outline" size={20} color="#D97706" />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowTitle}>{creditBalance.toLocaleString()} {copy.credits}</Text>
								<Text style={styles.rowSubtitle}>{copy.creditsHint}</Text>
								<Pressable
									onPress={() =>
										Linking.openURL(buildWhatsAppUrl(displayName, creditBalance)).catch(() =>
											showAppAlert("Error", copy.whatsappError),
										)
									}
									style={({ pressed }) => [styles.buyBtn, pressed && styles.pressed]}
									accessibilityRole="button"
									accessibilityLabel={copy.buyMore}
								>
									<Text style={styles.buyBtnText}>{copy.buyMore}</Text>
								</Pressable>
							</View>
						</View>
					) : null}
					<ProfileRow
						icon="chart-bar"
						iconColor="#16A34A"
						tint="#ECFDF3"
						title={copy.earnings}
						subtitle={copy.earningsHint}
						onPress={() => router.push("/(partner)/earnings-history")}
					/>
					<ProfileRow
						icon="clipboard-text-outline"
						iconColor="#F59E0B"
						tint="#FFF7ED"
						title={copy.orderHistory}
						subtitle={copy.orderHistoryHint}
						onPress={() =>
							router.navigate({
								pathname: "/(partner)/(tabs)/order",
								params: { filter: "completed" },
							})
						}
					/>
					<ProfileRow
						icon="tag-outline"
						iconColor="#7C3AED"
						tint="#F5F3FF"
						title={copy.services}
						subtitle={copy.servicesHint}
						onPress={() => router.push("/(partner)/settings")}
						isLast
					/>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>{copy.account}</Text>
					<Text style={styles.sectionSubtitle}>{copy.accountHint}</Text>
					<ProfileRow
						icon="bell-outline"
						iconColor="#E11D48"
						tint="#FFF1F2"
						title={copy.notifications}
						subtitle={copy.notificationsHint}
						onPress={() => router.push("/(customer)/settings")}
					/>
					<ProfileRow
						icon="cog-outline"
						iconColor="#2563EB"
						tint="#EFF6FF"
						title={copy.settings}
						subtitle={copy.settingsHint}
						onPress={() => router.push("/(customer)/settings")}
					/>
					<ProfileRow
						icon="help-circle-outline"
						iconColor="#7C3AED"
						tint="#F5F3FF"
						title={copy.help}
						subtitle={copy.helpHint}
						onPress={() => router.push("/(customer)/contact-support")}
						isLast
					/>
					<View style={styles.roleRow}>
						<View style={styles.rowBody}>
							<Text style={styles.rowTitle}>{copy.useAsUser}</Text>
							<Text style={styles.rowSubtitle}>{copy.useAsUserHint}</Text>
						</View>
						{isUpdatingRole ? (
							<GradientLoader size="small" />
						) : (
							<GradientSwitch
								value={isPartnerSwitchOn}
								onValueChange={(next) => void handleRoleToggle(next)}
								disabled={isUpdatingRole}
							/>
						)}
					</View>
				</View>

				<Pressable
					style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
					onPress={() => {
						showAppAlert(signOutCopy.signOutConfirmTitle, signOutCopy.signOutConfirmMessage, [
							{ text: signOutCopy.cancel, style: "cancel" },
							{
								text: signOutCopy.signOut,
								style: "destructive",
								onPress: async () => {
									await signOut();
									runAfterModalTeardown(() => {
										if (router.canDismiss && router.canDismiss()) {
											router.dismissAll && router.dismissAll();
										}
										router.replace("/(customer)");
									});
								},
							},
						]);
					}}
				>
					<MaterialCommunityIcons name="logout" size={18} color="#E11D48" />
					<Text style={styles.logoutLabel}>{copy.logout}</Text>
				</Pressable>
				<View style={styles.deleteWrap}>
					<DeleteAccountButton />
				</View>
			</ScrollView>
		</View>
	);
}

function ProfileRow({
	icon,
	iconColor,
	tint,
	title,
	subtitle,
	onPress,
	isLast,
}: {
	icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
	iconColor: string;
	tint: string;
	title: string;
	subtitle: string;
	onPress: () => void;
	isLast?: boolean;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.profileRowItem, !isLast && styles.rowDivider, pressed && styles.pressed]}
			accessibilityRole="button"
			accessibilityLabel={title}
		>
			<View style={[styles.iconWell, { backgroundColor: tint }]}>
				<MaterialCommunityIcons name={icon} size={20} color={iconColor} />
			</View>
			<View style={styles.rowBody}>
				<Text style={styles.rowTitle}>{title}</Text>
				<Text style={styles.rowSubtitle}>{subtitle}</Text>
			</View>
			<MaterialCommunityIcons name="chevron-right" size={20} color="#C5CDD8" />
		</Pressable>
	);
}

const NAVY = "#1B2559";
const MUTED = "#8B95A7";

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#F4F7FB" },
	content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
	contentWeb: { paddingTop: 0 },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	headerText: { flex: 1, paddingRight: 12 },
	headerTitle: { fontSize: 28, fontWeight: "800", color: NAVY, letterSpacing: -0.4 },
	headerSubtitle: { marginTop: 2, fontSize: 13, color: MUTED, fontWeight: "500" },
	gearBtn: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: NAVY,
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 3 },
		elevation: 2,
	},
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		shadowColor: NAVY,
		shadowOpacity: 0.05,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 4 },
		elevation: 2,
	},
	profileRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 8 },
	avatarWrap: { width: 72, height: 72 },
	avatar: { width: 72, height: 72, borderRadius: 36 },
	cameraBadge: {
		position: "absolute",
		right: -2,
		bottom: -2,
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: "#2563EB",
		borderWidth: 2,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	profileBody: { flex: 1, minWidth: 0 },
	nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	name: { flex: 1, fontSize: 18, fontWeight: "800", color: NAVY },
	editBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: "#E8F1FF",
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	editBtnText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
	contactRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
	addressRow: { alignItems: "flex-start" },
	addressIcon: { marginTop: 2 },
	contactText: { flex: 1, color: "#4B5563", fontSize: 13, fontWeight: "500" },
	storeCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderRadius: 22,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	storeIconWell: {
		width: 48,
		height: 48,
		borderRadius: 14,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#2563EB",
		shadowOpacity: 0.12,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	iconWell: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
	rowBody: { flex: 1, minWidth: 0 },
	rowTitle: { fontSize: 16, fontWeight: "800", color: NAVY },
	rowSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16, color: MUTED, fontWeight: "500" },
	sectionTitle: { fontSize: 20, fontWeight: "800", color: NAVY },
	sectionSubtitle: { marginTop: 2, marginBottom: 6, fontSize: 13, color: MUTED, fontWeight: "500" },
	profileRowItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
	rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEF2F6" },
	creditRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#EEF2F6",
	},
	buyBtn: { alignSelf: "flex-start", marginTop: 8, backgroundColor: "#E8F1FF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
	buyBtnText: { color: "#2563EB", fontSize: 12, fontWeight: "700", textAlign: "center" },
	roleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginTop: 4,
		paddingTop: 12,
		paddingBottom: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "#EEF2F6",
	},
	logoutBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#FDECEC",
		borderRadius: 16,
		paddingVertical: 16,
	},
	logoutLabel: { color: "#E11D48", fontSize: 16, fontWeight: "800" },
	deleteWrap: {},
	pressed: { opacity: 0.75 },
});
