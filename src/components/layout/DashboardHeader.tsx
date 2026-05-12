import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Moon, Sun, Menu, X, Crown, LogOut, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardHeaderProps {
  userTier: "free" | "paid";
  onUpgrade: () => void;
  onCreateNew?: () => void;
  guestMode?: boolean;
  onGuestAction?: () => void;
}

export function DashboardHeader({
  userTier,
  onUpgrade,
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
    <header className="sticky top-0 z-50 w-full border-b border-warm-grey bg-background/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="font-['Fraunces'] text-xl font-bold text-[#0D1833] hover:opacity-70 transition-opacity"
          >
            marktr
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Upgrade Badge - Free Users Only */}
            {userTier === "free" && (
              <Button
                onClick={onUpgrade}
                variant="outline"
                className="hidden sm:flex border-black rounded-design transition-all hover:scale-[1.02] items-center gap-2 bg-gradient-to-r from-[#FFD336] to-[#FF9922] text-text-dark"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden lg:inline">Upgrade</span>
              </Button>
            )}

            {/* Sign Out */}
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="hidden md:flex border-black rounded-design transition-all hover:scale-[1.02] items-center gap-2 bg-white"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Sign out</span>
              <span className="lg:hidden">Sign out</span>
            </Button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="hidden rounded-full border border-warm-grey p-2 transition-all hover:scale-110 hover:border-black md:block"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Account Avatar - Desktop */}
            <Link 
              to="/account"
              className="hidden md:flex w-10 h-10 rounded-full bg-[#BBA0E5] border border-black items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="font-['Fraunces'] text-sm">{getUserInitials()}</span>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-accent-grey/20 md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-warm-grey py-4 md:hidden">
            {/* Mobile Actions */}
            <div className="flex flex-col gap-3">
              {onCreateNew && (
                <Button
                  onClick={() => {
                    onCreateNew();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-button-green hover:bg-button-green/90 text-text-dark border border-black rounded-design"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New ICP
                </Button>
              )}

              {userTier === "free" && (
                <Button
                  onClick={() => {
                    onUpgrade();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-black rounded-design bg-gradient-to-r from-[#FFD336] to-[#FF9922] text-text-dark"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}

              <Button
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-black rounded-design bg-white text-text-dark"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>

              {/* Account Link - Mobile */}
              <Link 
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-2 py-3 border-t border-warm-grey hover:bg-accent-grey/20 transition-colors rounded-design"
              >
                <div className="w-10 h-10 rounded-full bg-[#BBA0E5] border border-black flex items-center justify-center">
                  <span className="font-['Fraunces'] text-sm">{getUserInitials()}</span>
                </div>
                <span className="font-['Inter'] text-sm">My Account</span>
              </Link>

              {/* Dark Mode Toggle - Mobile */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 px-2 py-3 border-t border-warm-grey hover:bg-accent-grey/20 transition-colors rounded-design"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="font-['Inter'] text-sm">
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
