import Layout, { type Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import Dashboard from "@/pages/Dashboard";
import DebtInvestments from "@/pages/DebtInvestments";
import MutualFunds from "@/pages/MutualFunds";
import NPS from "@/pages/NPS";
import SGB from "@/pages/SGB";
import StocksETFs from "@/pages/StocksETFs";
import Transactions from "@/pages/Transactions";
import { Coins, Loader2, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

// ─── Loading Screen ────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      data-ocid="app.loading_state"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Coins className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ─── Login Screen ──────────────────────────────────────────────────────────

function LoginScreen({
  onLogin,
  isLoggingIn,
}: {
  onLogin: () => void;
  isLoggingIn: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-sm">
              <Coins className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                Sreekanth Seelam
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Portfolio Tracker
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Your portfolio, secured on ICP</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sign in to access your portfolio data stored securely on the
              Internet Computer blockchain.
            </p>
          </div>

          {/* Login Button */}
          <Button
            data-ocid="auth.login.button"
            className="w-full"
            size="lg"
            onClick={onLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Login with Internet Identity"
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-loss">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Setup Modal ───────────────────────────────────────────────────

function ProfileSetupModal({
  onSave,
  isSaving,
}: {
  onSave: (name: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void onSave(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
        data-ocid="auth.profile.dialog"
      >
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Welcome!
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Set up your profile to get started.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Your Name</Label>
            <Input
              id="profile-name"
              data-ocid="auth.profile.input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isSaving}
            />
          </div>
          <Button
            data-ocid="auth.profile.submit_button"
            type="submit"
            className="w-full"
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── App Content (authenticated) ──────────────────────────────────────────

function AppContent({
  theme,
  onToggleTheme,
  userName,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  userName: string;
}) {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  function renderPage() {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "mutualfunds":
        return <MutualFunds />;
      case "stocks":
        return <StocksETFs />;
      case "debt":
        return <DebtInvestments />;
      case "nps":
        return <NPS />;
      case "sgb":
        return <SGB />;
      case "transactions":
        return <Transactions />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      userName={userName}
    >
      {renderPage()}
    </Layout>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("portfolio-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });

  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { actor } = useActor();

  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // appReady: show login screen after a short delay on mount.
  // We do NOT wait on loginStatus or isInitializing -- those cycle in a loop.
  // We just wait 1.5s for the auth client to restore a stored session,
  // then show whatever state we're in.
  const [appReady, setAppReady] = useState(false);
  const appReadyRef = useRef(false);

  // If identity appears before the timer fires, become ready immediately.
  useEffect(() => {
    if (identity && !appReadyRef.current) {
      appReadyRef.current = true;
      setAppReady(true);
    }
  }, [identity]);

  // 1.5s fallback so unauthenticated users see the login screen quickly.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!appReadyRef.current) {
        appReadyRef.current = true;
        setAppReady(true);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const isAuthenticated = !!identity;
  const prevIdentityRef = useRef<typeof identity>(undefined);
  const profileFetchedRef = useRef(false);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#0f172a");
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#ffffff");
    }
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  // Reset profile state when identity changes (login / logout)
  useEffect(() => {
    if (prevIdentityRef.current !== identity) {
      if (!identity) {
        setUserProfile(null);
        setProfileLoaded(false);
        profileFetchedRef.current = false;
      }
      prevIdentityRef.current = identity;
    }
  }, [identity]);

  // Load user profile once actor + identity are both available (once per session)
  useEffect(() => {
    if (!actor || !identity || profileFetchedRef.current) return;
    profileFetchedRef.current = true;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setProfileLoaded(true);
    }, 8000);

    actor
      .getCallerUserProfile()
      .then((profile) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setUserProfile(profile);
        setProfileLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setUserProfile(null);
        setProfileLoaded(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [actor, identity]);

  async function handleSaveProfile(name: string) {
    if (!actor) return;
    setIsSavingProfile(true);
    try {
      await actor.saveCallerUserProfile({ name });
      setUserProfile({ name });
    } catch {
      // ignore
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Phase 1: waiting for auth client to initialise (max 1.5s)
  if (!appReady) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style:
              theme === "dark"
                ? {
                    background: "oklch(0.20 0.025 255)",
                    border: "1px solid oklch(0.28 0.025 255)",
                    color: "oklch(0.96 0.005 255)",
                  }
                : {
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                  },
          }}
        />
      </>
    );
  }

  // Phase 2: authenticated, waiting for actor + profile (max 8s via timeout above)
  if (isAuthenticated && (!actor || !profileLoaded)) {
    return <LoadingScreen />;
  }

  // Show profile setup if authenticated but no profile yet
  if (isAuthenticated && profileLoaded && !userProfile) {
    return (
      <>
        <ProfileSetupModal
          onSave={handleSaveProfile}
          isSaving={isSavingProfile}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <PortfolioProvider actor={actor!}>
      <AppContent
        theme={theme}
        onToggleTheme={toggleTheme}
        userName={userProfile?.name ?? ""}
      />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style:
            theme === "dark"
              ? {
                  background: "oklch(0.20 0.025 255)",
                  border: "1px solid oklch(0.28 0.025 255)",
                  color: "oklch(0.96 0.005 255)",
                }
              : {
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                },
        }}
      />
    </PortfolioProvider>
  );
}
