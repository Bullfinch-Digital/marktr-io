import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isRealUser } from "../../utils/isRealUser";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isRealUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
