import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Moon, Sun, Menu, X, LogOut, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { BrandSwitcher } from "./BrandSwitcher";

interface DashboardHeaderProps {
  onCreateNew?: () => void;
  guestMode?: boolean;
  onGuestAction?: () => void;
}

export function DashboardHeader({
  onCreateNew,
  guestMode = false,
  onGuestAction,
}: DashboardHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "U";
    const name = user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const handleSignOut = async () => {
    if (guestMode) {
      onGuestAction?.();
      return;
    }
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-stroke bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link to="/" className="shrink-0">
              <img
                src="/brand/Marktrio_Logo_01.png"
                alt="marktr"
                className="h-7 w-auto dark:hidden"
              />
              <img
                src="/brand/Marktrio_Logo_02.png"
                alt="marktr"
                className="hidden h-7 w-auto dark:block"
              />
            </Link>
            {!guestMode && <BrandSwitcher />}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Sign Out */}
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="hidden h-11 min-w-11 md:inline-flex"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Sign out</span>
              <span className="lg:hidden">Sign out</span>
            </Button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="hidden h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke transition-all hover:-translate-y-px md:inline-flex app-focus-ring"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Account Avatar - Desktop */}
            <Link
              to="/account"
              className="hidden md:flex h-11 w-11 rounded-full bg-brand-lavender border-2 border-brand-stroke items-center justify-center cursor-pointer hover:-translate-y-px transition-transform app-focus-ring"
            >
              <span className="font-['Fraunces'] text-sm text-brand-navy">{getUserInitials()}</span>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] hover:bg-muted/60 md:hidden app-focus-ring"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-brand-stroke py-4 md:hidden">
            {/* Mobile Actions */}
            <div className="flex flex-col gap-3">
              {onCreateNew && (
                <Button
                  onClick={() => {
                    onCreateNew();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full h-11"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New ICP
                </Button>
              )}

              <Button
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full h-11"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>

              {/* Account Link - Mobile */}
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 px-2 py-3 border-t border-brand-stroke hover:bg-muted/40 transition-colors rounded-[14px]"
              >
                <div className="h-11 w-11 rounded-full bg-brand-lavender border-2 border-brand-stroke flex items-center justify-center">
                  <span className="font-['Fraunces'] text-sm text-brand-navy">{getUserInitials()}</span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-sm">My Account</span>
              </Link>

              {/* Dark Mode Toggle - Mobile */}
              <button
                onClick={toggleDarkMode}
                className="flex min-h-11 items-center gap-3 px-2 py-3 border-t border-brand-stroke hover:bg-muted/40 transition-colors rounded-[14px]"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="font-['Plus_Jakarta_Sans'] text-sm">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
