import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { X, Lock, Shield, CheckCircle2, ArrowLeft } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBack?: () => void;
  plan: "annual";
  userEmail?: string;
}

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onBack,
  plan: _plan,
  userEmail = "" 
}: CheckoutModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [country, setCountry] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const planDetails = { price: "£25", billing: "year", total: "£300" };
  const selectedPlan = planDetails;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-warm-grey p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-button-green" />
              <h2 className="font-['Fraunces'] text-2xl">
                Secure Checkout
              </h2>
            </div>
            <p className="font-['Inter'] text-sm text-foreground/70">
              Payments processed securely via Polar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Change plan
            </button>
          )}

          {/* Order Summary */}
          <div className="bg-accent-grey/20 border border-warm-grey rounded-design p-6 mb-8">
            <h3 className="font-['Fraunces'] text-lg mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-['Inter'] text-sm">Annual Plan</span>
                <span className="font-['Fraunces'] text-lg">{selectedPlan.price}/mo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                  <span className="font-['Inter'] text-foreground/60">Billed annually</span>
                  <span className="font-['Inter'] text-foreground/60">{selectedPlan.total}</span>
                </div>
              <div className="pt-3 border-t border-warm-grey flex items-center justify-between">
                <span className="font-['Fraunces'] text-lg">Total Today</span>
                <span className="font-['Fraunces'] text-2xl">{selectedPlan.total}</span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-['Inter'] text-sm">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-black rounded-design font-['Inter']"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-['Inter'] text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-black rounded-design font-['Inter']"
              />
            </div>

            {/* Card Details Placeholder */}
            <div className="space-y-2">
              <Label htmlFor="card" className="font-['Inter'] text-sm">
                Card Details
              </Label>
              <div className="bg-accent-grey/10 border border-black rounded-design p-4">
                <div className="flex items-center gap-2 text-foreground/60">
                  <Lock className="w-4 h-4" />
                  <span className="font-['Inter'] text-sm">Secure card input (Polar/Stripe)</span>
                </div>
                <p className="font-['Inter'] text-xs text-foreground/50 mt-2">
                  Card details are encrypted and processed securely. We never store your card information.
                </p>
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="font-['Inter'] text-sm">
                Country
              </Label>
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger className="border-black rounded-design font-['Inter']">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="border-black rounded-design">
                  <SelectItem value="gb">United Kingdom</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="es">Spain</SelectItem>
                  <SelectItem value="it">Italy</SelectItem>
                  <SelectItem value="nl">Netherlands</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Legal Agreement */}
            <div className="bg-accent-grey/20 border border-warm-grey rounded-design p-4">
              <p className="font-['Inter'] text-xs text-foreground/70">
                By subscribing, you agree to recurring charges and our{" "}
                <a href="/terms-of-service" className="underline hover:text-foreground">Terms of Service</a>
                {" "}&{" "}
                <a href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</a>
                . You can cancel anytime.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design py-6 text-lg transition-all hover:scale-[1.02] hover:shadow-lg font-['Inter'] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Confirm & Start Subscription"}
            </Button>

            {/* Security Badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap text-foreground/60">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="font-['Inter'] text-xs">SSL encrypted</span>
              </div>
              <span className="text-foreground/30">•</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-['Inter'] text-xs">Cancel anytime</span>
              </div>
              <span className="text-foreground/30">•</span>
              <span className="font-['Inter'] text-xs">No hidden fees</span>
            </div>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-warm-grey">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/terms-of-service" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <span className="text-foreground/30">•</span>
              <a href="/privacy-policy" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <span className="text-foreground/30">•</span>
              <a href="#" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Cancellation Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
