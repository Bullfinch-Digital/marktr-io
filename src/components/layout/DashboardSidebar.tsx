import { useEffect, useState } from "react";
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
  ListChecks,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLatestActivePlan } from "../../hooks/useLatestActivePlan";
import { isRealUser } from "../../utils/isRealUser";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "marktr.sidebar.collapsed";

function readStoredCollapsed(): boolean | null {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    return null;
  }
  return null;
}

function writeStoredCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    // Private mode or blocked storage: keep the choice for this visit only.
  }
}

function initialCollapsed() {
  const stored = readStoredCollapsed();
  if (stored !== null) return stored;
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1100;
}

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
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const location = useLocation();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1099px)");
    const onChange = () => {
      if (readStoredCollapsed() !== null) return;
      setIsCollapsed(query.matches);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      writeStoredCollapsed(next);
      return next;
    });
  };
  const { user } = useAuth();
  const latestPlanId = useLatestActivePlan();
  const dashboardPath = isRealUser(user) ? "/dashboard" : "/guest-dashboard";
  const planPath = latestPlanId ? `/plan/${latestPlanId}` : "/plan";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, locked: false, path: dashboardPath },
    { id: "strategy", label: "Strategy", icon: Target, locked: false, path: "/strategy" },
    { id: "plan", label: "Plan", icon: ListChecks, locked: false, path: planPath },
    { id: "content", label: "Content", icon: FileText, locked: false, path: "/content" },
    { id: "scheduling", label: "Scheduling", icon: Calendar, locked: false, path: "/scheduling" },
    { id: "icps", label: "My ICPs", icon: Users, locked: false, path: "/icps" },
    { id: "brands", label: "My Brands", icon: Building2, locked: false, path: "/my-brands" },
    { id: "collections", label: "Collections", icon: Folder, locked: false, path: "/collections" },
    { id: "insights", label: "Insights", icon: BarChart2, locked: true, path: "/insights" },
    { id: "settings", label: "Settings", icon: Settings, locked: false, path: "/account" },
  ];

  const mobileNavItems = navItems.filter((item) =>
    ["dashboard", "strategy", "plan", "content", "scheduling"].includes(item.id)
  );

  const getIsActive = (item: (typeof navItems)[0]) => {
    if (!item.path) return false;
    if (item.path === dashboardPath) {
      return location.pathname === dashboardPath || location.pathname === "/dashboard";
    }
    if (item.id === "plan") {
      return location.pathname === "/plan" || location.pathname.startsWith("/plan/");
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
          sticky top-0 z-30 hidden h-dvh max-h-dvh shrink-0 self-start flex-col overflow-hidden
          border-r border-sidebar-border bg-sidebar text-sidebar-foreground
          transition-[width] duration-200 ease-out motion-reduce:transition-none
          md:flex
        `}
      >
        <div
          className={`flex shrink-0 ${
            isCollapsed
              ? "flex-col items-center gap-1 px-1.5 pt-3 pb-2"
              : "min-h-[4.5rem] items-center gap-2 px-3 pt-5 pb-3"
          }`}
        >
          {!isCollapsed && (
            <Link
              to={dashboardPath}
              className="flex min-w-0 flex-1 items-center"
              onClick={(e) => {
                if (guestMode && !isGuestAllowedPath(dashboardPath)) {
                  e.preventDefault();
                  onGuestAction?.();
                }
              }}
            >
              <img
                src="/brand/Marktrio_Logo_02.png"
                alt="marktr.io"
                className="h-7 w-auto max-w-[168px] object-contain object-left"
              />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-controls="app-sidebar-nav"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] text-[color:var(--sidebar-muted)] transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-ring)] motion-reduce:transition-none"
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform duration-200 motion-reduce:transition-none ${isCollapsed ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {isCollapsed && (
            <Link
              to={dashboardPath}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-ring)]"
              onClick={(e) => {
                if (guestMode && !isGuestAllowedPath(dashboardPath)) {
                  e.preventDefault();
                  onGuestAction?.();
                }
              }}
            >
              <span
                className="font-['Fraunces'] text-xl font-semibold leading-none text-sidebar-primary"
                aria-label="Marktr home"
              >
                M
              </span>
            </Link>
          )}
        </div>

        <nav id="app-sidebar-nav" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain px-2 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);

            const buttonContent = (
              <>
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? "text-sidebar-primary-foreground" : "text-[color:var(--sidebar-muted)]"
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`font-['Plus_Jakarta_Sans'] text-sm font-medium truncate ${
                      isActive ? "text-sidebar-primary-foreground" : "text-[color:var(--sidebar-muted)]"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </>
            );

            const buttonClasses = `w-full flex items-center rounded-[14px] transition-all group relative min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-ring)] ${
              isCollapsed ? "justify-center gap-0 px-0 py-3" : "gap-3 px-3 py-2.5"
            } ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : item.locked
                  ? "opacity-45 cursor-not-allowed"
                  : "hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`;

            const link = (
              <Link
                to={item.path || "#"}
                className={buttonClasses}
                aria-label={isCollapsed ? item.label : undefined}
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

            if (!isCollapsed) {
              return (
                <div key={item.id} className="w-full">
                  {link}
                </div>
              );
            }

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="border-2 border-brand-stroke font-['Plus_Jakarta_Sans'] text-sm"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      {/* Mobile workspace navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);
            return (
              <Link
                key={`mobile-${item.id}`}
                to={item.path || "#"}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-1.5 text-[10px] leading-tight ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-[color:var(--sidebar-muted)]"
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
                <span className="font-['Plus_Jakarta_Sans'] font-medium text-center line-clamp-2 w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
