import React, { useCallback, useEffect, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import { DeleteAccountButton } from "@/components/delete-account-button";
import { AppCtaButton } from "@/components/ui/cta-button";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { subscribeProfileAvatarUpdated } from "@/lib/profile-avatar-refresh";
import { fetchPartnerOnboardingRequest } from "@/lib/partner-onboarding-request";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { showAppAlert } from "@/components/app-alert";
import { AvatarImage } from "@/components/avatar-image";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";
import { getStrings } from "@/locales";
import { UI } from "@/constants/theme";

const PAD = 20;
const ICON_WELL = "#EEF2FF";

export default function CustomerProfileMenu() {
	const router = useRouter();
	const { user, signOut, refreshRole } = useAuth();
	const { locale } = useLocale();
	const s = getStrings(locale).customer.profileTab;
	const { confirm, dialog: confirmDialog } = useConfirmDialog();
	const { isWeb } = useResponsiveLayout();
	const isFocused = useIsFocused();
	const insets = useSafeAreaInsets();
	useSuppressWebScreenHeader();

	const [isUpdatingRole, setIsUpdatingRole] = useState(false);
	const [roleSwitchValue, setRoleSwitchValue] = useState<boolean | null>(null);

	const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
	const [displayName, setDisplayName] = useState<string>("User");
	const [displayPhone, setDisplayPhone] = useState<string>("");

	const fetchProfile = useCallback(async () => {
		if (!isSupabaseConfigured()) return;
		try {
			const {
				data: { session },
			} = await getSession();
			const currentUser = session?.user ?? user;
			if (!currentUser?.id) return;
			const { data, error } = await supabase
				.from("profiles")
				.select("full_name,first_name,last_name,phone,image_url,updated_at")
				.eq("id", currentUser.id)
				.maybeSingle<{
					full_name: string | null;
					first_name: string | null;
					last_name: string | null;
					phone: string | null;
					image_url: string | null;
					updated_at: string | null;
				}>();

			if (error || !data) {
				setAvatarUri(
					(currentUser.user_metadata as any)?.avatar_url ??
						(currentUser.user_metadata as any)?.picture ??
						undefined,
				);
				return;
			}
			const resolvedName =
				(data.full_name ?? "").trim() ||
				[data.first_name ?? "", data.last_name ?? ""].join(" ").trim() ||
				user?.user_metadata?.full_name ||
				user?.user_metadata?.first_name ||
				"User";
			setDisplayName(resolvedName);
			setDisplayPhone(data.phone ?? (currentUser.user_metadata as any)?.phone ?? "");
			setAvatarUri(avatarUrlWithCacheBuster(data.image_url, data.updated_at));
		} catch {
			// ignore and leave placeholder
		}
	}, [user]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	useFocusEffect(
		useCallback(() => {
			fetchProfile();
		}, [fetchProfile]),
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

		if (value) {
			const { data: onboardingRequest, error: onboardingError } =
				await fetchPartnerOnboardingRequest(user.id);
			if (onboardingError) {
				showAppAlert("Error", onboardingError.message);
				return;
			}
			const { data: partnerProfile, error: partnerProfileError } = await supabase
				.from("partner_profiles")
				.select("id")
				.eq("id", user.id)
				.maybeSingle();
			if (partnerProfileError) {
				showAppAlert("Error", partnerProfileError.message);
				return;
			}
			const isFirstTimeBecomingLaunderer = !onboardingRequest && !partnerProfile;

			if (isFirstTimeBecomingLaunderer) {
				setRoleSwitchValue(true);
				const confirmed = await confirm({
					title: "Become a Laundry Captain",
					message:
						"Are you sure you want to become a Laundry Captain? You will be asked to provide your business details.",
					confirmLabel: "Confirm",
					cancelLabel: "Cancel",
				});
				if (confirmed) {
					performRoleUpdate(true);
				} else {
					setRoleSwitchValue(false);
				}
				return;
			}

			performRoleUpdate(true);
		} else {
			performRoleUpdate(false);
		}
	};

	const performRoleUpdate = async (value: boolean) => {
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
			let destination:
				| "/(partner)"
				| "/(partner)/onboarding?from=role_switch&returnTo=customer_profile"
				| "/(customer)" = value ? "/(partner)" : "/(customer)";
			if (value) {
				const { data: onboardingRequest, error: onboardingError } =
					await fetchPartnerOnboardingRequest(user.id);
				if (onboardingError) throw onboardingError;
				if (!onboardingRequest) {
					const { data: partnerProfile, error: partnerProfileError } = await supabase
						.from("partner_profiles")
						.select("id")
						.eq("id", user.id)
						.maybeSingle();
					if (partnerProfileError) throw partnerProfileError;
					if (!partnerProfile) {
						destination =
							"/(partner)/onboarding?from=role_switch&returnTo=customer_profile";
					}
				}
			}
			const delayMs = 320;
			await new Promise((r) => setTimeout(r, delayMs));
			router.replace(destination);
		} catch (err) {
			setRoleSwitchValue(!value);
			const message = err instanceof Error ? err.message : "Could not update role.";
			showAppAlert("Error", message);
		} finally {
			setIsUpdatingRole(false);
		}
	};

	const isPartnerSwitchOn =
		roleSwitchValue !== null
			? roleSwitchValue
			: (user?.user_metadata?.role ?? "customer") === "launderer";

	const MenuRow = ({
		icon,
		iconColor,
		iconBg,
		label,
		hint,
		onPress,
	}: {
		icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
		iconColor: string;
		iconBg: string;
		label: string;
		hint: string;
		onPress?: () => void;
	}) => (
		<Pressable
			style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
		>
			<View style={[styles.menuIconWell, { backgroundColor: iconBg }]}>
				<MaterialCommunityIcons name={icon} size={20} color={iconColor} />
			</View>
			<View style={styles.menuCopy}>
				<Text style={styles.menuLabel}>{label}</Text>
				<Text style={styles.menuHint} numberOfLines={1}>
					{hint}
				</Text>
			</View>
			<MaterialCommunityIcons name="chevron-right" size={20} color={UI.muted} />
		</Pressable>
	);

	// Pads with the provider inset instead of SafeAreaView: the native view
	// reports a 0 top inset for one frame while Android swaps screens, which
	// snaps the title under the status bar.
	const ProfileHeader = () =>
		!isWeb ? (
			<View style={[styles.safeArea, { paddingTop: insets.top }]}>
				<View style={styles.header}>
					<View style={styles.headerCopy}>
						<Text style={styles.title}>{s.title}</Text>
						<Text style={styles.subtitle}>{s.subtitle}</Text>
					</View>
					<View style={styles.headerActions}>
						<Pressable
							onPress={() => router.push("/(customer)/settings")}
							style={styles.iconBtn}
							accessibilityRole="button"
							accessibilityLabel={s.notificationsA11y}
						>
							<MaterialCommunityIcons name="bell-outline" size={20} color={UI.text} />
							<View style={styles.notifDot} />
						</Pressable>
						<Pressable
							onPress={() => router.push("/(customer)/settings")}
							style={styles.iconBtn}
							accessibilityRole="button"
							accessibilityLabel={s.settingsA11y}
						>
							<MaterialCommunityIcons name="cog-outline" size={20} color={UI.text} />
						</Pressable>
					</View>
				</View>
			</View>
		) : (
			<WebHeaderSpacer />
		);

	if (!user?.id) {
		return (
			<View style={styles.container}>
				<StatusBar style="dark" />
				<ProfileHeader />
				<ScrollView
					contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.guestPromo}>
						<Text style={styles.guestTitle}>{s.guestTitle}</Text>
						<Text style={styles.guestSubtitle}>{s.guestSubtitle}</Text>
						<View style={styles.guestActions}>
							<AppCtaButton
								label={s.logIn}
								leftIcon="key-variant"
								width="half"
								onPress={() =>
									router.push({
										pathname: "/(auth)/login",
										params: { returnTo: "profile" },
									})
								}
							/>
							<AppCtaButton
								label={s.signUp}
								leftIcon="account-outline"
								width="half"
								onPress={() =>
									router.push({
										pathname: "/(auth)/sign-up",
										params: { returnTo: "profile" },
									})
								}
							/>
						</View>
					</View>

					<View style={styles.menuList}>
						<MenuRow
							icon="help-circle-outline"
							iconColor={UI.blue}
							iconBg="#EEF2FF"
							label={s.faq}
							hint={s.helpSupportHint}
							onPress={() => router.push("/(customer)/faq")}
						/>
						<MenuRow
							icon="headphones"
							iconColor={UI.blue}
							iconBg="#EEF2FF"
							label={s.contactSupport}
							hint={s.helpSupportHint}
							onPress={() => router.push("/(customer)/contact-support")}
						/>
					</View>
				</ScrollView>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<ProfileHeader />
			<ScrollView
				contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
				showsVerticalScrollIndicator={false}
			>
				<Pressable
					style={({ pressed }) => [
						styles.profileCard,
						pressed && styles.pressed,
					]}
					onPress={() => router.push("/(customer)/edit-profile")}
					accessibilityRole="button"
					accessibilityLabel={s.editProfileA11y}
				>
					<View style={styles.avatarWrap}>
						<AvatarImage
							uri={avatarUri}
							name={displayName}
							size={64}
							style={styles.avatar}
						/>
						<View style={styles.cameraBadge}>
							<MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
						</View>
					</View>
					<View style={styles.profileMeta}>
						<Text style={styles.name} numberOfLines={1}>
							{displayName}
						</Text>
						{displayPhone ? (
							<Text style={styles.metaLine} numberOfLines={1}>
								{displayPhone}
							</Text>
						) : null}
					</View>
					<MaterialCommunityIcons name="chevron-right" size={22} color={UI.text} />
				</Pressable>

				<View style={styles.menuList}>
					<MenuRow
						icon="map-marker-outline"
						iconColor={UI.blue}
						iconBg="#EEF2FF"
						label={s.addresses}
						hint={s.addressesHint}
						onPress={() => router.push("/(customer)/addresses")}
					/>
					<MenuRow
						icon="heart-outline"
						iconColor="#E11D48"
						iconBg="#FEE2E2"
						label={s.favourites}
						hint={s.favouritesHint}
						onPress={() =>
							router.push({
								pathname: "/(customer)/pick-launderer",
								params: { chip: "favourites", from: "profile" },
							})
						}
					/>
					<MenuRow
						icon="headphones"
						iconColor={UI.blue}
						iconBg="#EEF2FF"
						label={s.helpSupport}
						hint={s.helpSupportHint}
						onPress={() => router.push("/(customer)/contact-support")}
					/>
				</View>

				<View style={styles.roleCard}>
					<Pressable
						style={({ pressed }) => [styles.roleRow, pressed && styles.pressed]}
						onPress={() => !isUpdatingRole && handleRoleToggle(!isPartnerSwitchOn)}
					>
						<Text style={styles.roleLabel}>{s.becomeCaptain}</Text>
						<View style={styles.switchWrap}>
							{isUpdatingRole ? (
								<GradientLoader size="small" />
							) : (
								<Switch
									value={isPartnerSwitchOn}
									onValueChange={handleRoleToggle}
									disabled={isUpdatingRole}
									trackColor={{ false: UI.chipBorder, true: UI.teal }}
									thumbColor="#FFFFFF"
									ios_backgroundColor={UI.chipBorder}
								/>
							)}
						</View>
					</Pressable>
					<Text style={styles.roleHint}>{s.becomeCaptainHint}</Text>
				</View>

				{!isWeb ? (
					<View style={styles.accountActionsRow}>
						<Pressable
							style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
							onPress={() => {
								showAppAlert(s.signOutConfirmTitle, s.signOutConfirmMessage, [
									{ text: s.cancel, style: "cancel" },
									{
										text: s.signOut,
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
							<MaterialCommunityIcons name="logout" size={16} color={UI.teal} />
							<Text style={styles.signOutLabel}>{s.signOut}</Text>
						</Pressable>

						<DeleteAccountButton />
					</View>
				) : null}
			</ScrollView>
			{confirmDialog}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#FFFFFF" },
	safeArea: { backgroundColor: "#FFFFFF" },
	header: {
		paddingHorizontal: PAD,
		paddingTop: 4,
		paddingBottom: 12,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	headerCopy: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	title: {
		fontSize: 28,
		lineHeight: 34,
		color: UI.text,
		fontFamily: "Poppins-Bold",
	},
	subtitle: {
		fontSize: 13,
		color: UI.muted,
		fontFamily: "Poppins-Regular",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingTop: 4,
	},
	iconBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: ICON_WELL,
		alignItems: "center",
		justifyContent: "center",
	},
	notifDot: {
		position: "absolute",
		top: 10,
		right: 11,
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: UI.red,
		borderWidth: 1.5,
		borderColor: "#FFFFFF",
	},
	content: { paddingHorizontal: PAD, paddingBottom: 120, gap: 14 },
	contentWeb: { paddingTop: 0 },
	guestPromo: {
		marginTop: 4,
		marginBottom: 4,
	},
	guestTitle: {
		fontSize: 24,
		fontFamily: "Poppins-Bold",
		fontWeight: "700",
		color: UI.text,
		marginBottom: 8,
	},
	guestSubtitle: {
		fontSize: 15,
		fontFamily: "Poppins-Regular",
		lineHeight: 22,
		color: UI.muted,
		marginBottom: 20,
	},
	guestActions: {
		flexDirection: "row",
		gap: 10,
	},
	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		backgroundColor: UI.card,
		borderRadius: 18,
		padding: 14,
		borderWidth: 1,
		borderColor: UI.chipBorder,
		shadowColor: UI.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 1,
		shadowRadius: 10,
		elevation: 2,
	},
	avatarWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		overflow: "visible",
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
	},
	cameraBadge: {
		position: "absolute",
		bottom: 0,
		right: 0,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: UI.purple,
		borderWidth: 2,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	profileMeta: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	name: {
		fontSize: 17,
		fontFamily: "Poppins-Bold",
		fontWeight: "700",
		color: UI.text,
	},
	metaLine: {
		fontSize: 13,
		fontFamily: "Poppins-Regular",
		color: UI.muted,
	},
	menuList: {
		gap: 10,
	},
	menuCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		backgroundColor: UI.card,
		borderRadius: 16,
		paddingVertical: 14,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: UI.chipBorder,
		shadowColor: UI.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 1,
		shadowRadius: 6,
		elevation: 1,
	},
	menuIconWell: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	menuCopy: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	menuLabel: {
		color: UI.text,
		fontSize: 15,
		fontFamily: "Poppins-SemiBold",
		fontWeight: "600",
	},
	menuHint: {
		color: UI.muted,
		fontSize: 12,
		fontFamily: "Poppins-Regular",
	},
	pressed: { opacity: 0.7 },
	roleCard: {
		padding: 16,
		borderRadius: 16,
		backgroundColor: UI.openBg,
		borderWidth: 1,
		borderColor: "#A7F3D0",
	},
	roleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	roleLabel: {
		fontSize: 16,
		fontFamily: "Poppins-Bold",
		color: UI.text,
		fontWeight: "700",
		flex: 1,
	},
	switchWrap: { transform: [{ scale: 1.02 }] },
	roleHint: {
		fontSize: 13,
		fontFamily: "Poppins-Regular",
		color: UI.openText,
		lineHeight: 18,
		marginTop: 8,
	},
	accountActionsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 12,
		marginTop: 4,
	},
	signOutBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: UI.card,
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: UI.teal,
	},
	signOutLabel: {
		fontSize: 15,
		fontFamily: "Poppins-Bold",
		fontWeight: "700",
		color: UI.teal,
	},
});
