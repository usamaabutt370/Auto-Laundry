import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { assets } from "@/assets/assets";

const c = theme.colors;

export default function CustomerProfileMenu() {
	const router = useRouter();
	const { user, signOut, refreshRole } = useAuth();

	const [isUpdatingRole, setIsUpdatingRole] = useState(false);
	const [roleSwitchValue, setRoleSwitchValue] = useState<boolean | null>(null);

	const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

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
				.select("image_url,updated_at")
				.eq("id", currentUser.id)
				.maybeSingle();

			if (error || !data) {
				// fallback to any avatar in user metadata
				setAvatarUri((currentUser.user_metadata as any)?.avatar_url ?? (currentUser.user_metadata as any)?.picture ?? undefined);
				return;
			}
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

	const name =
		user?.user_metadata?.full_name || user?.user_metadata?.first_name || user?.email || "User";
	const email = user?.email ?? "";

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
			router.replace(value ? "/(partner)/dashboard" : "/(customer)");
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
				<Pressable style={styles.topRow} onPress={() => router.push("/(customer)/edit-profile") }>
					<View style={styles.avatarWrap}>
						<Image
							source={avatarUri ? { uri: avatarUri } : assets.images.profile_placeholder}
							style={styles.avatar}
						/>
					</View>
					<View style={styles.userInfo}>
						<Text style={styles.name}>{name}</Text>
						<Text style={styles.email}>{email}</Text>
					</View>
				</Pressable>

				
			
				
<View style={styles.divider} />
				<View style={styles.menuGroup}>
					
					<MenuItem icon="help-circle-outline" label="FAQ" onPress={()=> router.push("/(customer)/faq")} />
					<MenuItem icon="headphones" label="Contact support" onPress={() => router.push("/(customer)/contact-support")} />
					<MenuItem icon="cog-outline" label="Settings" onPress={() => router.push("/(customer)/settings")} />
					<MenuItem
						icon="logout"
						label="Sign out"
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
					/>
					
					
					
				</View>
					<View style={styles.roleCard}>
					<View style={styles.roleRow}>
						<Text style={styles.roleLabel}>Become a launderer</Text>
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
					<Text style={styles.roleHint}>Offer laundry services and manage orders as a launderer.</Text>
				</View>
				<View style={styles.divider} />

			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: c.background },
	content: { padding: 20 },
	topRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
	avatarWrap: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: c.backgroundLight, borderWidth: 1, borderColor: c.blue600 },
	avatar: { width: "100%", height: "100%" },
	userInfo: { flex: 1 },
	name: { fontSize: 18, fontWeight: "700", color: c.white },
	email: { fontSize: 13, color: c.blue500, marginTop: 2 },
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
});
