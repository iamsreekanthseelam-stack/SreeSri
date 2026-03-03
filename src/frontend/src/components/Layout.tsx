import type { Theme } from "@/App";
import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gem,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  ShieldCheck,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";

export type Page =
  | "dashboard"
  | "mutualfunds"
  | "stocks"
  | "debt"
  | "nps"
  | "sgb"
  | "transactions";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  ocid: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    ocid: "nav.dashboard.link",
  },
  {
    id: "mutualfunds",
    label: "Mutual Funds",
    icon: TrendingUp,
    ocid: "nav.mutualfunds.link",
  },
  {
    id: "stocks",
    label: "Stocks & ETFs",
    icon: BarChart2,
    ocid: "nav.stocks.link",
  },
  { id: "debt", label: "Debt", icon: Landmark, ocid: "nav.debt.link" },
  { id: "nps", label: "NPS", icon: ShieldCheck, ocid: "nav.nps.link" },
  { id: "sgb", label: "SGB", icon: Gem, ocid: "nav.sgb.link" },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    ocid: "nav.transactions.link",
  },
];

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  userName?: string;
}

export default function Layout({
  currentPage,
  onNavigate,
  children,
  theme,
  onToggleTheme,
  userName,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  function handleLogout() {
    queryClient.clear();
    clear();
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow">
          <Coins className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display font-bold text-sm text-foreground leading-none">
              Sreekanth Seelam
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio Tracker
            </p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              data-ocid={item.ocid}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      {userName && (
        <div
          className={cn(
            "px-4 py-3 border-t border-sidebar-border flex",
            collapsed ? "justify-center" : "justify-between items-center gap-2",
          )}
        >
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {userName}
              </p>
              <p className="text-[10px] text-muted-foreground">Logged in</p>
            </div>
          )}
          <button
            data-ocid="auth.logout.button"
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
              "border border-sidebar-border hover:bg-destructive/15 hover:border-destructive/30 text-muted-foreground hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Theme Toggle */}
      <div
        className={cn(
          "px-4 py-3 border-t border-sidebar-border flex",
          collapsed ? "justify-center" : "justify-between items-center",
        )}
      >
        {!collapsed && (
          <span className="text-xs text-muted-foreground">
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
        )}
        <button
          data-ocid="nav.theme.toggle"
          type="button"
          onClick={onToggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            "border border-sidebar-border hover:bg-sidebar-accent text-muted-foreground hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
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
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          data-ocid="nav.sidebar.toggle"
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute bottom-20 left-full -translate-x-1/2 z-10 w-5 h-5 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ position: "sticky" }}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 text-muted-foreground"
            data-ocid="nav.sidebar.toggle"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Coins className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">
              Sreekanth Seelam
            </span>
          </div>
          {/* Mobile theme toggle */}
          <button
            data-ocid="nav.theme.toggle"
            type="button"
            onClick={onToggleTheme}
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-sidebar-border hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
