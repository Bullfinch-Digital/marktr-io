import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PaywallProvider } from "./contexts/PaywallContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { OAuthReturnHandler } from "./components/auth/OAuthReturnHandler";
import { AdminRoute } from "./components/auth/AdminRoute";
import { Header, Footer } from "./components";
import Home from "./pages/Home";
import OnboardingBuild from "./pages/OnboardingBuild";
import HealthCheck from "./pages/HealthCheck";
import HealthCheckResults from "./pages/HealthCheckResults";
import HealthReport from "./pages/HealthReport";
import StoryBuild from "./pages/StoryBuild";
import StoryResults from "./pages/StoryResults";
import StoryReport from "./pages/StoryReport";
import IcpReport from "./pages/IcpReport";
import GuestDashboardPreview from "./pages/GuestDashboardPreview";
import Dashboard from "./pages/Dashboard";
import ICPEditor from "./pages/ICPEditor";
import MyICPsPage from "./pages/MyICPs";
import Collections from "./pages/Collections";
import CollectionView from "./pages/CollectionView";
import PaywallDemo from "./pages/PaywallDemo";
import PaymentSuccess from "./pages/PaymentSuccess";
import PlaceholderPage from "./pages/PlaceholderPage";
import MyAccount from "./pages/MyAccount";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import TeamSettings from "./pages/TeamSettings";
import Strategy from "./pages/Strategy";
import StrategyEditor from "./pages/StrategyEditor";
import Content from "./pages/Content";
import ContentEditor from "./pages/ContentEditor";
import ResetPassword from "./pages/ResetPassword";
import Logout from "./pages/Logout";
import AuthCallback from "./pages/AuthCallback";
import CheckEmail from "./pages/CheckEmail";
import BetaSignup from "./pages/BetaSignup";
import MyBrands from "./pages/MyBrands";
import BrandEditor from "./pages/BrandEditor";
import GuestIcpPreview from "./pages/GuestIcpPreview";
import GuestHealthPreview from "./pages/GuestHealthPreview";
import Resources from "./pages/Resources";
import ResourcePost from "./pages/ResourcePost";
import Downloads from "./pages/Downloads";
import NewsletterLanding from "./pages/NewsletterLanding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import { CookieConsentBanner } from "./components/legal/CookieConsentBanner";
import { bullfinchPageView } from "./lib/bullfinchAnalytics";
import { hasAnalyticsConsent } from "./lib/cookieConsent";
import { useEdition } from "./contexts/EditionContext";
import OnboardingLayout from "./layouts/OnboardingLayout";
import HealthCheckPublicReport from "./pages/HealthCheckPublicReport";

let lastTrackedPath: string | null = null;

function GA4RouteTracker() {
  const location = useLocation();
  const { edition, config } = useEdition();

  useEffect(() => {
    const track = () => {
      if (!hasAnalyticsConsent()) return;
      if (!config.ga4Id) return;

      const pagePath = `${location.pathname}${location.search}${location.hash}`;
      if (lastTrackedPath === pagePath) return;
      lastTrackedPath = pagePath;

      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (!gtag) return;

      const bullfinchView =
        edition === "bullfinch"
          ? bullfinchPageView({
              origin: window.location.origin,
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
            })
          : null;

      gtag("event", "page_view", {
        send_to: config.ga4Id,
        page_title: document.title,
        page_location: bullfinchView?.page_location ?? window.location.href,
        page_path: bullfinchView?.page_path ?? pagePath,
        edition,
      });
    };

    track();
    window.addEventListener("marktr:analytics-consent-granted", track);
    return () => window.removeEventListener("marktr:analytics-consent-granted", track);
  }, [location.pathname, location.search, location.hash, edition, config.ga4Id]);

  return null;
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isRealUser = user && !(user as any).is_anonymous;
  return <Navigate to={isRealUser ? "/dashboard" : "/"} replace />;
}

function AppRoutes() {
  const { edition } = useEdition();
  const location = useLocation();

  if (edition === "bullfinch") {
    return (
      <Routes>
        <Route element={<OnboardingLayout />}>
          <Route path="/" element={<HealthCheck />} />
          <Route path="/r/:token" element={<HealthCheckPublicReport />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={{ pathname: "/", search: location.search }} replace />}
        />
      </Routes>
    );
  }

  return (
              <Routes>
            {/* Public Routes with Header/Footer */}
            <Route path="/" element={
              <>
                <Header />
                <Home />
                <Footer />
              </>
            } />
            
            <Route path="/pricing" element={
              <>
                <Header />
                <Pricing />
                <Footer />
              </>
            } />

            <Route path="/resources" element={
              <>
                <Header />
                <Resources />
                <Footer />
              </>
            } />

            <Route path="/resources/:slug" element={
              <>
                <Header />
                <ResourcePost />
                <Footer />
              </>
            } />

            <Route path="/downloads" element={
              <>
                <Header />
                <Downloads />
                <Footer />
              </>
            } />

            <Route path="/newsletter" element={
              <>
                <Header />
                <NewsletterLanding />
                <Footer />
              </>
            } />

            <Route path="/privacy-policy" element={
              <>
                <Header />
                <PrivacyPolicy />
                <Footer />
              </>
            } />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />

            <Route path="/terms-of-service" element={
              <>
                <Header />
                <TermsOfService />
                <Footer />
              </>
            } />
            <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />

            <Route path="/cookie-policy" element={
              <>
                <Header />
                <CookiePolicy />
                <Footer />
              </>
            } />
            <Route path="/cookies" element={<Navigate to="/cookie-policy" replace />} />
            
            {/* Auth Routes — /login and /signup are legacy entry points; AuthRedirect sends real users to /dashboard, others to / */}
            <Route path="/login" element={<AuthRedirect />} />
            <Route path="/signup" element={<AuthRedirect />} />
            <Route path="/beta-signup" element={<BetaSignup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/check-email" element={<CheckEmail />} />
            
            {/* Onboarding flows — public Header, no Footer */}
            <Route element={<OnboardingLayout />}>
              <Route path="/onboarding-build" element={<OnboardingBuild />} />
              <Route path="/health-check" element={<HealthCheck />} />
              <Route path="/health-check/results" element={<HealthCheckResults />} />
              <Route path="/story" element={<StoryBuild />} />
              <Route path="/story/results" element={<StoryResults />} />
              <Route path="/guest-dashboard" element={<GuestDashboardPreview />} />
              <Route path="/icp-preview/:index" element={<GuestIcpPreview />} />
              <Route path="/health-preview" element={<GuestHealthPreview />} />
            </Route>

            {/* Other public routes without Header/Footer */}
            <Route path="/paywall-demo" element={<PaywallDemo />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/health-report" element={
              <ProtectedRoute>
                <HealthReport />
              </ProtectedRoute>
            } />
            <Route path="/story-report" element={
              <ProtectedRoute>
                <StoryReport />
              </ProtectedRoute>
            } />
            <Route path="/icp-report" element={
              <ProtectedRoute>
                <IcpReport />
              </ProtectedRoute>
            } />
            <Route path="/icp/:id" element={
              <ProtectedRoute>
                <ICPEditor />
              </ProtectedRoute>
            } />
            <Route path="/icps" element={
              <ProtectedRoute>
                <MyICPsPage />
              </ProtectedRoute>
            } />
            <Route path="/my-brands" element={
              <ProtectedRoute>
                <MyBrands />
              </ProtectedRoute>
            } />
            <Route path="/my-brands/:id" element={
              <ProtectedRoute>
                <BrandEditor />
              </ProtectedRoute>
            } />
            <Route path="/collections" element={
              <ProtectedRoute>
                <Collections />
              </ProtectedRoute>
            } />
            <Route path="/collections/:id" element={
              <ProtectedRoute>
                <CollectionView />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/team" element={
              <ProtectedRoute>
                <TeamSettings />
              </ProtectedRoute>
            } />
            <Route path="/strategy" element={
              <ProtectedRoute>
                <Strategy />
              </ProtectedRoute>
            } />
            <Route path="/strategy/:id" element={
              <ProtectedRoute>
                <StrategyEditor />
              </ProtectedRoute>
            } />
            <Route path="/content" element={
              <ProtectedRoute>
                <Content />
              </ProtectedRoute>
            } />
            <Route path="/content/:id" element={
              <ProtectedRoute>
                <ContentEditor />
              </ProtectedRoute>
            } />
            <Route path="/scheduling" element={
              <ProtectedRoute>
                <PlaceholderPage title="Scheduling" />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route for preview and other unmatched routes */}
            <Route path="*" element={
              <>
                <Header />
                <Home />
                <Footer />
              </>
            } />
              </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Auth modals use react-router <Link> (legal copy). They must live
            inside Router — otherwise Login mounts outside NavigationContext
            and white-screens: "Cannot destructure property 'basename'".
            PaywallProvider also calls useAuthModal, so it stays nested here. */}
        <AuthModalProvider>
          <PaywallProvider>
            <GA4RouteTracker />
            <OAuthReturnHandler />
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
            <CookieConsentBanner />
          </PaywallProvider>
        </AuthModalProvider>
      </Router>
    </AuthProvider>
  );
}
