import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Folder,
  BarChart2,
  Settings,
  ChevronLeft,
  Building2,
  Target,
  FileText,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardSidebarProps {
  userTier: "free" | "paid";
  onUpgrade: () => void;
  guestMode?: boolean;
  onGuestAction?: () => void;
  subscriptionLoading?: boolean;
}

export function DashboardSidebar({
  userTier: _userTier,
  onUpgrade,
  guestMode = false,
  onGuestAction,
  subscriptionLoading: _subscriptionLoading,
}: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const dashboardPath = user ? "/dashboard" : "/guest-dashboard";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, locked: false, path: dashboardPath },
    { id: "strategy", label: "Strategy", icon: Target, locked: false, path: "/strategy" },
    { id: "content", label: "Content", icon: FileText, locked: false, path: "/content" },
    { id: "scheduling", label: "Scheduling", icon: Calendar, locked: false, path: "/scheduling" },
    { id: "icps", label: "My ICPs", icon: Users, locked: false, path: "/icps" },
    { id: "brands", label: "My Brands", icon: Building2, locked: false, path: "/my-brands" },
    { id: "collections", label: "Collections", icon: Folder, locked: false, path: "/collections" },
    { id: "insights", label: "Insights", icon: BarChart2, locked: true, path: "/insights" },
    { id: "settings", label: "Settings", icon: Settings, locked: false, path: "/settings" },
  ];

  const mobileNavItems = navItems.filter((item) =>
    ["dashboard", "icps", "strategy", "content", "scheduling"].includes(item.id)
  );

  const getIsActive = (item: (typeof navItems)[0]) => {
    if (!item.path) return false;
    if (item.path === dashboardPath) {
      return location.pathname === dashboardPath || location.pathname === "/dashboard";
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const isGuestAllowedPath = (path?: string) => {
    if (!path) return false;
    if (path === "/guest-dashboard") return true;
    if (path.startsWith("/icp-preview")) return true;
    return false;
  };

  const asideWidth = isCollapsed ? "w-[4.5rem]" : "w-[280px]";

  return (
    <>
      <aside
        className={`
          ${asideWidth}
          bg-sidebar text-sidebar-foreground border-r border-sidebar-border
          transition-[width] duration-300 ease-out
          flex-shrink-0 flex-col hidden lg:flex
        `}
      >
        {/* Wordmark + collapse */}
        <div className="flex items-center gap-2 px-3 pt-5 pb-3 min-h-[4.5rem]">
          <Link
            to={dashboardPath}
            className={`flex-1 min-w-0 flex items-center ${isCollapsed ? "justify-center" : ""}`}
            onClick={(e) => {
              if (guestMode && !isGuestAllowedPath(dashboardPath)) {
                e.preventDefault();
                onGuestAction?.();
              }
            }}
          >
            {isCollapsed ? (
              <span
                className="font-['Fraunces'] text-xl font-semibold text-sidebar-primary leading-none"
                aria-label="Marktr home"
              >
                M
              </span>
            ) : (
              <span className="font-['Fraunces'] text-2xl font-semibold tracking-tight text-sidebar-foreground leading-none">
                Marktr
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-2 rounded-design shrink-0
              text-[color:var(--sidebar-muted)] hover:text-sidebar-foreground
              hover:bg-sidebar-accent transition-colors
              ${isCollapsed ? "mx-auto" : ""}
            `}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 px-2 pb-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);

            const buttonContent = (
              <>
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? "text-sidebar-primary" : "text-[color:var(--sidebar-muted)]"
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`font-['Inter'] text-sm truncate ${
                      isActive ? "text-sidebar-foreground" : "text-[color:var(--sidebar-muted)]"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </>
            );

            const buttonClasses = `w-full flex items-center gap-3 rounded-design transition-all group relative ${
              isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"
            } ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--color-sidebar-primary)]"
                : item.locked
                  ? "opacity-45 cursor-not-allowed"
                  : "hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
            }`;

            return (
              <Link
                key={item.id}
                to={item.path || "#"}
                className={buttonClasses}
                onClick={(e) => {
                  if (guestMode && !isGuestAllowedPath(item.path)) {
                    e.preventDefault();
                    onGuestAction?.();
                    return;
                  }
                  if (item.locked) {
                    e.preventDefault();
                    onUpgrade();
                  }
                }}
              >
                {buttonContent}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile workspace navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-md">
        <div className="grid grid-cols-5 gap-0.5 px-1 py-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);
            return (
              <Link
                key={`mobile-${item.id}`}
                to={item.path || "#"}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-design px-1 py-1.5 text-[10px] leading-tight ${
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-[color:var(--sidebar-muted)]"
                }`}
                onClick={(e) => {
                  if (guestMode && !isGuestAllowedPath(item.path)) {
                    e.preventDefault();
                    onGuestAction?.();
                    return;
                  }
                  if (item.locked) {
                    e.preventDefault();
                    onUpgrade();
                  }
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-['Inter'] text-center line-clamp-2 w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
