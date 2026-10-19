import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { BrandProvider } from "../../contexts/BrandContext";
import { isRealUser } from "../../utils/isRealUser";
import useSubscription from "../../hooks/useSubscription";
import useProfile from "../../hooks/useProfile";
import { AccessGate } from "../access/AccessGate";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Signed-in users without Pro access see the trial gate. Account and admin opt out. */
  requireAccess?: boolean;
}

function AccessLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="text-foreground/70">Loading...</p>
      </div>
    </div>
  );
}

function RequireAccess({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isPro, ready } = useSubscription();
  const { profile, loading: profileLoading, error: profileError } = useProfile(user?.id ?? null);
  const profileSettled = profile !== null || Boolean(profileError);

  if (!ready || profileLoading || !profileSettled) {
    return <AccessLoading />;
  }

  if (isPro || profile?.role === "admin") {
    return <BrandProvider>{children}</BrandProvider>;
  }

  return <AccessGate />;
}

export function ProtectedRoute({ children, requireAccess = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AccessLoading />;
  }

  if (!isRealUser(user)) {
    return <Navigate to="/" replace />;
  }

  if (!requireAccess) {
    return <BrandProvider>{children}</BrandProvider>;
  }

  return <RequireAccess>{children}</RequireAccess>;
}
