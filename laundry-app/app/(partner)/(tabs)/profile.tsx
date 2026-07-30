import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Switch, ActivityIndicator } from "react-native";
import { Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { subscribeProfileAvatarUpdated } from "@/lib/profile-avatar-refresh";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { awardWelcomeCredits } from "@/lib/partner-credits";
import { showAppAlert } from "@/components/app-alert";
import { AvatarImage } from "@/components/avatar-image";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";

const c = theme.colors;
const WHATSAPP_PHONE = "923004639943";

function buildWhatsAppUrl(name: string, balance: number | null): string {
	const message = `Hello! I am ${name} and I would like to buy credits. My current balance is ${balance?.toLocaleString() ?? 0} credits.`;
	return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export default function PartnerProfileMenu() {
	const router = useRouter();
	const { user, signOut, refreshRole } = useAuth();
	const { isWeb } = useResponsiveLayout();
	const isFocused = useIsFocused();
	useSuppressWebScreenHeader();

	const [isUpdatingRole, setIsUpdatingRole] = useState(false);
	const [roleSwitchValue, setRoleSwitchValue] = useState<boolean | null>(null);
	const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
	const [displayName, setDisplayName] = useState<string>("Laundry Captain");
	const [displayPhone, setDisplayPhone] = useState<string>("");
	const [creditBalance, setCreditBalance] = useState<number | null>(null);

	const fetchProfile = useCallback(async () => {
		if (!isSupabaseConfigured() || !user?.id) return;
		try {
			const { data, error } = await supabase
				.from("partner_profiles")
				.select("image_url,updated_at,status")
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
				"Laundry Captain";
			setDisplayName(resolvedName);
			setDisplayPhone(profileData?.phone ?? (user?.user_metadata as any)?.phone ?? "");

			if (error || !data) {
				// Fallback to customer profile image if partner image is missing
				if (profileData) {
					setAvatarUri(avatarUrlWithCacheBuster(profileData.image_url, profileData.updated_at));
				}
				return;
			}
			setAvatarUri(avatarUrlWithCacheBuster(data.image_url, data.updated_at));
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

	const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) => (
		<Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]} onPress={onPress}>
			<MaterialCommunityIcons name={icon as any} size={22} color={c.backgroundLight} />
			<Text style={styles.menuLabel}>{label}</Text>
		</Pressable>
	);

	return (
		<SafeAreaView style={styles.container} edges={isWeb ? [] : ["top"]}>
			{isWeb ? <WebHeaderSpacer /> : null}
			<ScrollView
				contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
				showsVerticalScrollIndicator={false}
			>
				<Pressable
					style={[styles.profileCard, isWeb && styles.profileCardWeb]}
					onPress={() => router.push("/(partner)/laundrerinfo")}
				>
					<View style={styles.avatarWrap}>
						<AvatarImage uri={avatarUri} name={displayName} size={80} style={styles.avatar} />
						<View style={styles.editBadge}>
							<MaterialCommunityIcons name="pencil" size={12} color={c.white} />
						</View>
					</View>
					<Text style={styles.name}>{displayName}</Text>
					<View style={styles.editPill}>
						<MaterialCommunityIcons name="pencil-outline" size={13} color={c.blue500} />
						<Text style={styles.editPillText}>Edit profile</Text>
					</View>
				</Pressable>

				<View style={styles.divider} />
				<View style={styles.menuGroup}>
					<MenuItem icon="storefront-outline" label="Business detail" onPress={() => router.push("/(partner)/business-detail")} />
					<MenuItem icon="cog-outline" label="Services prices" onPress={() => router.push("/(partner)/settings")} />
					<MenuItem icon="help-circle-outline" label="FAQs" onPress={() => router.push("/(customer)/faq")} />
					<MenuItem icon="headphones" label="Contact & Support" onPress={() => router.push("/(customer)/contact-support")} />
				</View>

				{creditBalance !== null ? (
					<View style={styles.creditCard}>
						<View>
							<Text style={styles.creditBalance}>{creditBalance.toLocaleString()}</Text>
							<Text style={styles.creditHint}>Available credits</Text>
						</View>
						<Pressable
							onPress={() => Linking.openURL(buildWhatsAppUrl(displayName, creditBalance)).catch(() => showAppAlert("Error", "Could not open WhatsApp."))}
							style={({ pressed }) => [styles.buyCreditsBtn, pressed && styles.pressed]}
						>
							<Text style={styles.buyCreditsBtnText}>Buy more credits</Text>
						</Pressable>
					</View>
				) : null}

				<View style={styles.roleCard}>
					<View style={styles.roleRow}>
						<Text style={styles.roleLabel}>Use app as user</Text>
						<View style={styles.switchWrap}>
							{isUpdatingRole ? (
								<ActivityIndicator color={c.white} size="small" />
							) : (
								<Switch
									value={isPartnerSwitchOn}
									onValueChange={handleRoleToggle}
									disabled={isUpdatingRole}
									trackColor={{ false: c.blue900, true: c.blue600 }}
									thumbColor={c.white}
									ios_backgroundColor={c.backgroundLight}
								/>
							)
							}
						</View>
					</View>
					<Text style={styles.roleHint}>Switch back to customer mode to place orders.</Text>
				</View>
				<View style={styles.divider} />

				<View style={styles.accountActionsRow}>
					<Pressable
						style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
						onPress={() => {
							showAppAlert("Sign out", "Are you sure you want to sign out?", [
								{ text: "Cancel", style: "cancel" },
								{
									text: "Sign out",
									style: "destructive",
									onPress: async () => {
										await signOut();
										if (router.canDismiss && router.canDismiss()) {
											router.dismissAll && router.dismissAll();
										}
										router.replace("/(auth)/login");
									},
								},
							]);
						}}
					>
						<MaterialCommunityIcons name="logout" size={16} color={c.white} />
						<Text style={styles.signOutLabel}>Sign out</Text>
					</Pressable>

					<DeleteAccountButton />
				</View>

			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: c.background },
	content: { padding: 20, paddingBottom: 120 },
	contentWeb: { paddingTop: 0 },
	profileCard: { alignItems: "center", paddingTop: 4, paddingBottom: 20, marginBottom: 8 },
	profileCardWeb: { paddingTop: 0 },
	avatarWrap: { width: 80, height: 80, borderRadius: 40, overflow: "visible", marginBottom: 12 },
	avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: c.blue600 },
	editBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: c.backgroundLight, borderWidth: 1.5, borderColor: c.background, alignItems: "center", justifyContent: "center" },
	name: { fontSize: 20, fontWeight: "700", color: c.white, textAlign: "center" },
	phone: { fontSize: 14, color: c.blue500, marginTop: 4, textAlign: "center" },
	editPill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
	editPillText: { fontSize: 13, color: c.blue500, fontWeight: "500" },
	creditCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.backgroundDark, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
	creditBalance: { fontSize: 22, fontWeight: "800", color: c.white, letterSpacing: 0.2 },
	creditHint: { fontSize: 12, color: c.blue500, fontWeight: "500", marginTop: 2 },
	buyCreditsBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: c.white },
	buyCreditsBtnText: { fontSize: 13, fontWeight: "700", color: c.background },
	accountActionsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 4 },
	divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 16 },
	menuGroup: { backgroundColor: "transparent", gap: 8 },
	menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
	menuLabel: { color: c.white, fontSize: 16, fontWeight: "600" },
	pressed: { opacity: 0.7 },
	roleCard: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", marginBottom: 12 },
	roleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	roleLabel: { fontSize: 17, color: c.white, fontWeight: "700", flex: 1 },
	switchWrap: { transform: [{ scale: 1.02 }] },
	roleHint: { fontSize: 13, color: c.blue500, lineHeight: 18, marginTop: 8 },
	signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.backgroundDark, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
	signOutLabel: { fontSize: 15, fontWeight: "700", color: c.white },
});
