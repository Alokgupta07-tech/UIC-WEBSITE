import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";

// Google icon SVG inline
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId && !loading) {
      navigate("/dashboard");
    }
  }, [userId, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Sign In — Unstop Igniters Club</title>
        <meta name="description" content="Sign in to Unstop Igniters Club with your Google account." />
      </Helmet>

      <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto">
                <Flame className="h-8 w-8 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Welcome to</h1>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Unstop Igniters Club
            </h2>
            <p className="mt-2 text-muted-foreground">
              Sign in with your Google account to access the member dashboard
            </p>
          </div>

          {/* Sign In Card */}
          <div className="rounded-2xl border bg-card p-8 shadow-lg text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Any Google / Gmail account is accepted.
              </p>
              <p className="text-xs text-muted-foreground">
                If sign-in is rejected, Google provider access must be enabled in the Supabase dashboard for this project.
              </p>
            </div>

            <Button
              onClick={signInWithGoogle}
              size="lg"
              variant="outline"
              className="w-full gap-3 h-12 text-base font-medium border-2 hover:bg-muted/50"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link to="/about" className="underline hover:text-foreground">
                Terms of Service
              </Link>
              .
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Just want to browse?{" "}
            <Link to="/" className="text-primary font-medium hover:underline">
              Continue as guest →
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
