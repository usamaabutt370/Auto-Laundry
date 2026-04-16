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

  const loadRole = useCallback(async (userId: string) => {
    const r = await fetchUserRole(userId);
    setRole(r);
    return r;
  }, []);

  const loadPartnerApproval = useCallback(async (userId: string) => {
    const { data } = await fetchPartnerOnboardingRequest(userId);
    setPartnerApprovalStatus(data?.status ?? null);
    setPartnerRejectionReason(data?.rejection_reason ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        Promise.all([
          loadRole(data.session.user.id),
          loadPartnerApproval(data.session.user.id),
        ]).finally(() => {
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
        loadRole(newSession.user.id);
        loadPartnerApproval(newSession.user.id);
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
  }, [loadPartnerApproval, loadRole]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    void registerForChatPush(uid);
  }, [session?.user?.id]);

  const refreshRole = useCallback(async () => {
    if (session?.user?.id) {
      await loadRole(session.user.id);
    }
  }, [session?.user?.id, loadRole]);

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
      await loadPartnerApproval(session.user.id);
    }
  }, [session?.user?.id, loadPartnerApproval]);

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
