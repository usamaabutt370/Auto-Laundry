import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { fetchPartnerOnboardingRequest } from "@/lib/partner-onboarding-request";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AvatarImage } from "@/components/avatar-image";

const c = theme.colors;

export default function CustomerProfileMenu() {
	const router = useRouter();
	const { user, signOut, refreshRole } = useAuth();

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
				// fallback to any avatar in user metadata
				setAvatarUri((currentUser.user_metadata as any)?.avatar_url ?? (currentUser.user_metadata as any)?.picture ?? undefined);
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
		}, [fetchProfile])
	);

	const handleRoleToggle = async (value: boolean) => {
		if (!user?.id || !isSupabaseConfigured() || isUpdatingRole) return;

		if (value) {
			const { data: onboardingRequest, error: onboardingError } =
				await fetchPartnerOnboardingRequest(user.id);
			if (onboardingError) {
				Alert.alert("Error", onboardingError.message);
				return;
			}
			const { data: partnerProfile, error: partnerProfileError } = await supabase
				.from("partner_profiles")
				.select("id")
				.eq("id", user.id)
				.maybeSingle();
			if (partnerProfileError) {
				Alert.alert("Error", partnerProfileError.message);
				return;
			}
			const isFirstTimeBecomingLaunderer = !onboardingRequest && !partnerProfile;

			if (isFirstTimeBecomingLaunderer) {
				setRoleSwitchValue(true);
				Alert.alert(
					"Become a Laundry Partner",
					"Are you sure you want to become a Laundry Partner? You will be asked to provide your business details.",
					[
						{
							text: "Cancel",
							style: "cancel",
							onPress: () => {
								setRoleSwitchValue(false);
							},
						},
						{
							text: "Confirm",
							onPress: () => performRoleUpdate(true),
						},
					]
				);
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
						destination = "/(partner)/onboarding?from=role_switch&returnTo=customer_profile";
					}
				}
			}
			const delayMs = 320;
			await new Promise((r) => setTimeout(r, delayMs));
			router.replace(destination);
		} catch (err) {
			setRoleSwitchValue(!value);
			const message = err instanceof Error ? err.message : "Could not update role.";
			Alert.alert("Error", message);
		} finally {
			setIsUpdatingRole(false);
		}
	};


	const isPartnerSwitchOn = roleSwitchValue !== null ? roleSwitchValue : (user?.user_metadata?.role ?? "customer") === "launderer";

	const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) => (
		<Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]} onPress={onPress}>
			<MaterialCommunityIcons name={icon as any} size={22} color={c.backgroundLight} />
			<Text style={styles.menuLabel}>{label}</Text>
		</Pressable>
	);

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Pressable style={styles.profileCard} onPress={() => router.push("/(customer)/edit-profile")}>
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

					<MenuItem icon="help-circle-outline" label="FAQs" onPress={() => router.push("/(customer)/faq")} />
					<MenuItem icon="headphones" label="Contact & Support" onPress={() => router.push("/(customer)/contact-support")} />
				</View>
				<View style={styles.roleCard}>
					<View style={styles.roleRow}>
						<Text style={styles.roleLabel}>Become a Laundry Partner</Text>
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
					<Text style={styles.roleHint}>Offer laundry services and manage orders as a Laundry Partner.</Text>
				</View>
				<View style={styles.divider} />

				<Pressable
					style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
					onPress={() => {
						Alert.alert("Sign out", "Are you sure you want to sign out?", [
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
					<MaterialCommunityIcons name="logout" size={18} color={c.white} />
					<Text style={styles.signOutLabel}>Sign out</Text>
				</Pressable>

			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: c.background },
	content: { padding: 20 },
	profileCard: { alignItems: "center", paddingVertical: 20, marginBottom: 8 },
	avatarWrap: { width: 80, height: 80, borderRadius: 40, overflow: "visible", marginBottom: 12 },
	avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: c.blue600 },
	editBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: c.backgroundLight, borderWidth: 1.5, borderColor: c.background, alignItems: "center", justifyContent: "center" },
	name: { fontSize: 20, fontWeight: "700", color: c.white, textAlign: "center" },
	phone: { fontSize: 14, color: c.blue500, marginTop: 4, textAlign: "center" },
	editPill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
	editPillText: { fontSize: 13, color: c.blue500, fontWeight: "500" },
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
	signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.backgroundDark, borderRadius: 12, paddingVertical: 14, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
	signOutLabel: { fontSize: 16, fontWeight: "700", color: c.white },
});
