import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isRealUser } from "../../utils/isRealUser";
import { NewsletterSignup } from "./NewsletterSignup";

export function Footer() {
  const { user } = useAuth();
  const dashboardPath = isRealUser(user) ? "/dashboard" : "/guest-dashboard";
  return (
    <footer className="border-t border-brand-stroke bg-background py-12 font-['Plus_Jakarta_Sans']">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Link to="/" className="mb-4 inline-block">
              <img
                src="/brand/Marktrio_Logo_01.png"
                alt="marktr.io"
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/brand/Marktrio_Logo_02.png"
                alt="marktr.io"
                className="hidden h-8 w-auto dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground">Your marketing team, built in.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/pricing"
                  data-track-id="footer_pricing"
                  data-track-location="footer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="/resources"
                  data-track-id="footer_resources"
                  data-track-location="footer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  to="/downloads"
                  data-track-id="footer_downloads"
                  data-track-location="footer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Downloads
                </Link>
              </li>
              <li>
                <Link
                  to={dashboardPath}
                  data-track-id="footer_dashboard"
                  data-track-location="footer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/collections"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cookie-policy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <NewsletterSignup source="footer" />
          </div>
        </div>

        <div className="mt-8 border-t border-brand-stroke pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} marktr.io. Created and managed by{" "}
            <a
              href="https://bullfinchdigital.com"
              className="underline transition-colors hover:text-foreground"
              rel="noopener noreferrer"
            >
              Bullfinch Digital Ltd
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
