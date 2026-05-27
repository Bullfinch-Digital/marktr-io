import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";

export default function PaywallDemo() {
  const navigate = useNavigate();
  const { openPaywall } = usePaywall();
  const { user } = useAuth();
  const dashboardPath = user ? "/dashboard" : "/guest-dashboard";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="font-['Fraunces'] text-4xl mb-4">
          Paywall Flow Demo
        </h1>
        <p className="font-['Inter'] text-foreground/70 mb-8">
          Click the button below to test the complete upgrade flow.
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => openPaywall()}
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 text-lg transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            Open Paywall Modal
          </Button>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate(dashboardPath)}
              variant="outline"
              className="border-black rounded-design px-6 py-3"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Flow Description */}
        <div className="mt-12 bg-accent-grey/20 border border-black rounded-design p-6 text-left">
          <h2 className="font-['Fraunces'] text-xl mb-4">Flow Steps:</h2>
          <ol className="space-y-2 font-['Inter'] text-sm">
            <li className="flex gap-3">
              <span className="font-bold">1.</span>
              <span>User sees Paywall Modal with feature comparison and pricing</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">2.</span>
              <span>User selects a plan (Annual or Monthly)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">3.</span>
              <span>Checkout Modal opens with payment form</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">4.</span>
              <span>Payment processes (simulated with 2s delay)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">5.</span>
              <span>Success page shows with next renewal date</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Modals */}
    </div>
  );
}
