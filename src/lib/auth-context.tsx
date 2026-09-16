"use client";

import { createContext, useContext, ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: { name: string; nameEn: string; email: string; role?: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAuthLoading: false,
  user: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user ? { name: session.user.name ?? "", nameEn: session.user.name ?? "", email: session.user.email ?? "", role: session.user.role } : null;

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", { email, password, redirect: false });
    return !result?.error;
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return response.ok;
  };

  const logout = async () => { await signOut({ redirect: false }); };

  return (
    <AuthContext.Provider value={{ isAuthenticated: status === "authenticated", isAuthLoading: status === "loading", user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
