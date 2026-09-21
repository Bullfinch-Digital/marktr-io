import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function GuestPreviewShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-6 pb-12 pt-8 lg:px-12">
        <button
          type="button"
          onClick={() => navigate("/guest-dashboard")}
          className="mb-6 font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
        >
          ← Back to your dashboard
        </button>
        {children}
      </div>
    </main>
  );
}
