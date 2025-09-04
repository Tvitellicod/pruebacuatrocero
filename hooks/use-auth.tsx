"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { auth, type AuthUser } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, fullName: string) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
    if (!isSupabaseConfigured()) {
      console.warn("Supabase no está configurado. Usando autenticación simulada.");
      setLoading(false);
      return;
    }

    const getInitialSession = async () => {
      try {
        const session = await auth.getSession();
        if (session?.user && isMounted) {
          const currentUser = await auth.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Error obteniendo la sesión inicial:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getInitialSession();

    const { data } = auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user && isMounted) {
          const currentUser = await auth.getCurrentUser();
          setUser(currentUser);
        } else if (isMounted) {
          setUser(null);
        }
      } catch (error) {
        console.error("Error en el cambio de estado de autenticación:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await auth.signIn(email, password);
      return result;
    } catch (error) {
      console.error("Error en signIn:", error);
      throw error;
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const result = await auth.signUp(email, password, fullName);
      return result;
    } catch (error) {
      console.error("Error en signUp:", error);
      throw error;
    }
  }

  const signOut = async () => {
    try {
      const result = await auth.signOut();
      if (!result.error) {
        setUser(null);
      }
      return result;
    } catch (error) {
      console.error("Error en signOut:", error);
      throw error;
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const result = await auth.resetPassword(email);
      return result;
    } catch (error) {
      console.error("Error en resetPassword:", error);
      throw error;
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}