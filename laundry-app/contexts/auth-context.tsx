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
}

const defaultState: AuthState = {
  session: null,
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthState | null>(null);

/** Load role from backend (e.g. profiles.role or partners table). Until backend is ready, returns null. */
async function fetchUserRole(_userId: string): Promise<UserRole | null> {
  if (!supabase) return null;
  // TODO: Developer B – fetch from profiles or partners table, e.g.:
  // const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  // return data?.role ?? null;
  return null;
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

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      isLoading,
      isAuthenticated: Boolean(session),
    }),
    [session, role, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
