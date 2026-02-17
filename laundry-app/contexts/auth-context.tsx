import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getSession, onAuthStateChange, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

export interface AuthState {
  session: Session | null;
  user: Session["user"] | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Call after updating profiles.role so the app reflects the new role and can redirect. */
  refreshRole: () => Promise<void>;
}

const defaultState: AuthState = {
  session: null,
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  refreshRole: async () => {},
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
  const [isLoading, setIsLoading] = useState(true);

  const loadRole = useCallback(async (userId: string) => {
    const r = await fetchUserRole(userId);
    setRole(r);
  }, []);

  useEffect(() => {
    let mounted = true;

    getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        loadRole(data.session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    const unsubscribe = onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        loadRole(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [loadRole]);

  const refreshRole = useCallback(async () => {
    if (session?.user?.id) {
      await loadRole(session.user.id);
    }
  }, [session?.user?.id, loadRole]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      isLoading,
      isAuthenticated: Boolean(session),
      refreshRole,
    }),
    [session, role, isLoading, refreshRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
