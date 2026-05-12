import React, { useState, useEffect } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthModal } from "../../contexts/AuthModalContext";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  type NavItem =
    | { label: string; type: "scroll"; target: string; color: string }
    | { label: string; type: "link"; target: string; color: string };

  const handleScrollNav = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setIsMobileMenuOpen(false);
    }
    // If not on home, let the Link navigate (SPA) to /#sectionId
  };

  const navItems: NavItem[] = [
    {
      label: "Know your customer",
      type: "link" as const,
      target: "/onboarding-build",
      color: "#FFD336", // Yellow
    },
    {
      label: "Check your health",
      type: "link" as const,
      target: "/health-check",
      color: "#96CBB6", // Mint green
    },
    {
      label: "Find your story",
      type: "link" as const,
      target: "/story",
      color: "#BBA0E5", // Purple
    },
    {
      label: "Pricing",
      type: "link" as const,
      target: "/pricing",
      color: "#F57BBE", // Pink
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-warm-grey bg-background/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-['Fraunces'] text-xl font-bold">marktr</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item, index) => (
              item.type === "scroll" ? (
                <Link
                  key={index}
                  to={`/#${item.target}`}
                  onClick={(e) => handleScrollNav(e, item.target)}
                  className="relative text-sm transition-colors hover:text-text-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-button-green after:transition-all hover:after:w-full flex items-center gap-1.5"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={index}
                  to={item.target}
                  className="relative text-sm transition-colors hover:text-text-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-button-green after:transition-all hover:after:w-full flex items-center gap-1.5"
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 transition-all hover:bg-accent-grey active:scale-95"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {user ? (
              <>
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="hidden bg-transparent text-foreground transition-all hover:scale-105 hover:bg-accent-grey/20 active:scale-95 md:flex font-bold font-['Fraunces']"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Sign out button clicked");
                    try {
                      await signOut();
                      console.log("Sign out successful, navigating...");
                      navigate("/", { replace: true });
                    } catch (err) {
                      console.error("Sign out error:", err);
                      alert("Error signing out");
                    }
                  }}
                  variant="outline"
                  className="hidden bg-transparent text-foreground transition-all hover:scale-105 hover:bg-accent-grey/20 active:scale-95 md:flex font-bold font-['Fraunces']"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => openLogin()}
                  variant="outline"
                  className="hidden bg-transparent text-foreground transition-all hover:scale-105 hover:bg-accent-grey/20 active:scale-95 md:flex font-bold font-['Fraunces']"
                >
                  Login
                </Button>

                <Link to="/onboarding-build">
                  <Button
                    variant="default"
                    className="hidden bg-button-green text-text-dark transition-all hover:scale-105 hover:bg-button-green/90 hover:shadow-lg active:scale-95 md:flex font-bold font-['Fraunces']"
                  >
                    Generate Free Now
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-2 md:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="flex flex-col gap-4 border-t border-warm-grey py-4 md:hidden">
            {navItems.map((item, index) => (
              item.type === "scroll" ? (
                <Link
                  key={index}
                  to={`/#${item.target}`}
                  onClick={(e) => handleScrollNav(e, item.target)}
                  className="px-2 py-1 transition-colors hover:text-button-green flex items-center gap-2 text-left"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={index}
                  to={item.target}
                  className="px-2 py-1 transition-colors hover:text-button-green flex items-center gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            ))}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="outline"
                    className="w-full bg-transparent text-foreground hover:bg-accent-grey/20 font-bold font-['Fraunces']"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMobileMenuOpen(false);
                    console.log("Sign out button clicked (mobile)");
                    try {
                      await signOut();
                      console.log("Sign out successful, navigating...");
                      navigate("/", { replace: true });
                    } catch (err) {
                      console.error("Sign out error:", err);
                      alert("Error signing out");
                    }
                  }}
                  variant="outline"
                  className="w-full bg-transparent text-foreground hover:bg-accent-grey/20 font-bold font-['Fraunces']"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLogin();
                  }}
                  variant="outline"
                  className="w-full bg-transparent text-foreground hover:bg-accent-grey/20 font-bold font-['Fraunces']"
                >
                  Login
                </Button>
                <Link to="/onboarding-build" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-button-green text-text-dark hover:bg-button-green/90 font-bold font-['Fraunces']">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
