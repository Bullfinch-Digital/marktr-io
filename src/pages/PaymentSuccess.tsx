import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { CheckCircle2, Sparkles, CreditCard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardPath = user ? "/dashboard" : "/guest-dashboard";

  // Calculate renewal date (30 days from now for monthly, 365 for annual)
  const getRenewalDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 365); // Assuming annual for demo
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleGoToDashboard = () => {
    navigate(dashboardPath);
  };

  const handleViewBilling = () => {
    console.log("Navigate to billing settings");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-gradient-to-br from-button-green/20 via-[#BBA0E5]/10 to-[#FFD336]/10 border border-black rounded-design p-8 lg:p-12 text-center shadow-2xl animate-fade-in-up">
          {/* Celebration Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-button-green rounded-full border-2 border-black flex items-center justify-center mx-auto mb-4 relative animate-bounce-subtle">
              <CheckCircle2 className="w-12 h-12 text-foreground" />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-[#FFD336] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="font-['Fraunces'] text-3xl lg:text-4xl mb-3">
            Upgrade Complete 🎉
          </h1>
          <p className="font-['Inter'] text-lg text-foreground/80 mb-8 max-w-lg mx-auto">
            Your full customer strategy is now unlocked.
          </p>

          {/* What's Unlocked */}
          <div className="bg-background border border-black rounded-design p-6 mb-8 text-left">
            <h2 className="font-['Fraunces'] text-xl mb-4 text-center">You now have access to:</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">All 3 ICPs unlocked</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">Full psychographic insights</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">Content strategy included</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">Meta Ads audience export</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">Unlimited ICP creation</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="font-['Inter'] text-sm">Collections & tagging</span>
              </div>
            </div>
          </div>

          {/* Renewal Information */}
          <div className="bg-accent-grey/30 border border-warm-grey rounded-design p-4 mb-8">
            <div className="flex items-start gap-3 text-left">
              <CreditCard className="w-5 h-5 text-foreground/60 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-['Inter'] text-sm text-foreground/70">
                  You'll next be charged on <strong>{getRenewalDate()}</strong>.
                </p>
                <p className="font-['Inter'] text-xs text-foreground/60 mt-1">
                  Manage billing anytime from your account settings.
                </p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-4">
            <Button
              onClick={handleGoToDashboard}
              className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design py-6 text-lg transition-all hover:scale-[1.02] hover:shadow-lg font-['Inter']"
            >
              Go to Dashboard
            </Button>

            <button
              onClick={handleViewBilling}
              className="w-full font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2"
            >
              View Billing Settings
            </button>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-6">
          <p className="font-['Inter'] text-sm text-foreground/60">
            Need help?{" "}
            <a href="#" className="underline hover:text-foreground transition-colors">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
