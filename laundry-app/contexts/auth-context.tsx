import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { registerForChatPush, unregisterChatPush } from "@/lib/push-notifications";
import {
  fetchPartnerOnboardingRequest,
  type PartnerOnboardingRequestStatus,
} from "@/lib/partner-onboarding-request";
import { isCurrentUserDeleted } from "@/lib/account-deletion";
import { getSession, onAuthStateChange, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

export interface AuthState {
  session: Session | null;
  user: Session["user"] | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  partnerApprovalStatus: PartnerOnboardingRequestStatus | null;
  partnerRejectionReason: string | null;
  /** Call after updating profiles.role so the app reflects the new role and can redirect. */
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshPartnerApproval: () => Promise<void>;
}

const defaultState: AuthState = {
  session: null,
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  partnerApprovalStatus: null,
  partnerRejectionReason: null,
  refreshRole: async () => {},
  refreshPartnerApproval: async () => {},
  signOut: async () => {},
};

const AuthContext = createContext<AuthState | null>(null);

const VALID_ROLES: UserRole[] = ["customer", "launderer"];

/** Load role from profiles.role. Defaults to customer when missing or invalid. */
async function fetchUserRole(userId: string): Promise<UserRole | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();
  if (error || !data?.role || !VALID_ROLES.includes(data.role as UserRole)) {
    return "customer";
  }
  return data.role as UserRole;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [partnerApprovalStatus, setPartnerApprovalStatus] =
    useState<PartnerOnboardingRequestStatus | null>(null);
  const [partnerRejectionReason, setPartnerRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOutDeleted = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setRole(null);
    setPartnerApprovalStatus(null);
    setPartnerRejectionReason(null);
  }, []);

  const syncUserState = useCallback(
    async (userId: string) => {
      if (await isCurrentUserDeleted()) {
        await signOutDeleted();
        return;
      }

      const r = await fetchUserRole(userId);
      setRole(r);

      const { data } = await fetchPartnerOnboardingRequest(userId);
      setPartnerApprovalStatus((data?.status ?? null) as PartnerOnboardingRequestStatus | null);
      setPartnerRejectionReason(data?.rejection_reason ?? null);
    },
    [signOutDeleted],
  );

  useEffect(() => {
    let mounted = true;

    getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        syncUserState(data.session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setRole(null);
        setPartnerApprovalStatus(null);
        setPartnerRejectionReason(null);
        setIsLoading(false);
      }
    });

    const unsubscribe = onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        // Keep role + approval in sync when token refreshes or user signs in.
        // isLoading is NOT touched here — the cold-start case is owned by
        // getSession() above, and login/sign-up navigate directly by role.
        void syncUserState(newSession.user.id);
      } else {
        setRole(null);
        setPartnerApprovalStatus(null);
        setPartnerRejectionReason(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [syncUserState]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    void registerForChatPush(uid);
  }, [session?.user?.id]);

  const refreshRole = useCallback(async () => {
    if (session?.user?.id) {
      const r = await fetchUserRole(session.user.id);
      setRole(r);
    }
  }, [session?.user?.id]);

  const signOut = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) {
      await unregisterChatPush(uid);
    }
    if (supabase) {
      await supabase.auth.signOut();
      // Manually clear state to ensure real-time UI updates
      setSession(null);
      setRole(null);
    }
  }, [session?.user?.id]);

  const refreshPartnerApproval = useCallback(async () => {
    if (session?.user?.id) {
      const { data } = await fetchPartnerOnboardingRequest(session.user.id);
      setPartnerApprovalStatus((data?.status ?? null) as PartnerOnboardingRequestStatus | null);
      setPartnerRejectionReason(data?.rejection_reason ?? null);
    }
  }, [session?.user?.id]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      isLoading,
      isAuthenticated: Boolean(session),
      partnerApprovalStatus,
      partnerRejectionReason,
      refreshRole,
      signOut,
      refreshPartnerApproval,
    }),
    [
      session,
      role,
      isLoading,
      partnerApprovalStatus,
      partnerRejectionReason,
      refreshRole,
      signOut,
      refreshPartnerApproval,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
