import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function Footer() {
  const { user } = useAuth();
  const dashboardPath = user ? "/dashboard" : "/guest-dashboard";
  return (
    <footer className="border-t border-accent-grey bg-neutral-light py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="font-fraunces text-xl font-bold text-text-dark mb-4">
              marktr
            </h3>
            <p className="text-sm text-text-dark/80">
              Your marketing team, built in.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-inter font-semibold text-text-dark mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/pricing" className="text-text-dark/80 hover:text-button-green transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to={dashboardPath} className="text-text-dark/80 hover:text-button-green transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/collections" className="text-text-dark/80 hover:text-button-green transition-colors">
                  Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-inter font-semibold text-text-dark mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-text-dark/80 hover:text-button-green transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-text-dark/80 hover:text-button-green transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-accent-grey text-center text-sm text-text-dark/80">
          <p>
            &copy; {new Date().getFullYear()} marktr.io. Created and managed by{" "}
            <a
              href="https://bullfinchdigital.com"
              className="underline hover:text-button-green transition-colors"
              rel="noopener noreferrer"
            >
              Bullfinch Digital Ltd
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
