"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, tokenStore } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonatedName: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    company_name?: string;
  }) => Promise<User>;
  impersonate: (userId: string) => Promise<User>;
  stopImpersonating: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  const router = useRouter();

  const syncImpersonation = useCallback(() => {
    setIsImpersonating(tokenStore.isImpersonating);
    setImpersonatedName(tokenStore.impersonatedName);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    syncImpersonation();
  }, [refreshUser, syncImpersonation]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>(
      "/auth/login",
      { email, password },
      { auth: false }
    );
    tokenStore.set(res.tokens.access_token, res.tokens.refresh_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      company_name?: string;
    }) => {
      const res = await api.post<AuthResponse>("/auth/register", data, {
        auth: false,
      });
      tokenStore.set(res.tokens.access_token, res.tokens.refresh_token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const impersonate = useCallback(
    async (userId: string) => {
      const res = await api.post<AuthResponse>(
        `/admin/customers/${userId}/impersonate`
      );
      tokenStore.beginImpersonation(
        res.tokens.access_token,
        res.tokens.refresh_token,
        res.user.name
      );
      setUser(res.user);
      syncImpersonation();
      router.push("/dashboard");
      return res.user;
    },
    [router, syncImpersonation]
  );

  const stopImpersonating = useCallback(async () => {
    const restored = tokenStore.endImpersonation();
    syncImpersonation();
    if (restored) {
      await refreshUser();
      router.push("/admin");
    } else {
      tokenStore.clear();
      setUser(null);
      router.push("/login");
    }
  }, [refreshUser, router, syncImpersonation]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setIsImpersonating(false);
    setImpersonatedName(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isImpersonating,
        impersonatedName,
        login,
        register,
        impersonate,
        stopImpersonating,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
