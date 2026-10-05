import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isRealUser } from "../../utils/isRealUser";
import { NewsletterSignup } from "./NewsletterSignup";

export function Footer() {
  const { user } = useAuth();
  const dashboardPath = isRealUser(user) ? "/dashboard" : "/guest-dashboard";
  return (
    <footer className="border-t border-accent-grey bg-neutral-light py-12 font-['Plus_Jakarta_Sans']">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Link to="/" className="mb-4 inline-block">
              <img
                src="/brand/Marktrio_Logo_01.png"
                alt="marktr.io"
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-text-dark/80">Your marketing team, built in.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 font-['Plus_Jakarta_Sans'] font-semibold text-text-dark">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/pricing"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="/resources"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  to="/downloads"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Downloads
                </Link>
              </li>
              <li>
                <Link
                  to={dashboardPath}
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/collections"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-['Plus_Jakarta_Sans'] font-semibold text-text-dark">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cookie-policy"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-text-dark/80 transition-colors hover:text-button-green"
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

        <div className="mt-8 border-t border-accent-grey pt-8 text-center text-sm text-text-dark/80">
          <p>
            &copy; {new Date().getFullYear()} marktr.io. Created and managed by{" "}
            <a
              href="https://bullfinchdigital.com"
              className="underline transition-colors hover:text-button-green"
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
