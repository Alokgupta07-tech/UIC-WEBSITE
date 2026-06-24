import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SITE_URL } from "@/features/seo/seoConfig";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roleLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const navigate = useNavigate();

  const refreshAdminRole = async (userId?: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    setIsAdmin(Boolean(data));
    setRoleLoading(false);
  };

  useEffect(() => {
    // Listen for auth state changes (handles redirect callback from Google)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        void refreshAdminRole(session?.user?.id ?? null);

        if (event === "SIGNED_IN") {
          toast.success("Welcome to Unstop Igniters Club!");
          navigate("/dashboard");
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      void refreshAdminRole(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("provider is not enabled") || message.includes("unsupported provider")) {
        toast.error("Google sign-in is disabled in Supabase. Enable the Google provider in the dashboard first.");
      } else {
        toast.error("Failed to sign in with Google. Please try again.");
      }
      console.error("Google sign-in error:", error);
    }
    // On success, Supabase redirects to Google then back to the app.
    // The onAuthStateChange listener above handles the rest.
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
      setRoleLoading(false);
      toast.success("Signed out successfully.");
      navigate("/");
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, roleLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
