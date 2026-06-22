import { Input } from "../ui/input";
import { Label } from "../ui/label";

type IdentityCaptureProps = {
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  showName?: boolean;
  showEmail?: boolean;
  className?: string;
};

export function IdentityCapture({
  name,
  email,
  onNameChange,
  onEmailChange,
  showName = true,
  showEmail = true,
  className = "",
}: IdentityCaptureProps) {
  if (!showName && !showEmail) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {showName && (
        <div className="space-y-2">
          <Label htmlFor="guest-identity-name" className="font-['DM_Sans'] text-sm text-[#0D1833]">
            What should we call you?
          </Label>
          <Input
            id="guest-identity-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your first name"
            className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
          />
        </div>
      )}

      {showEmail && (
        <div className="space-y-2">
          <Label htmlFor="guest-identity-email" className="font-['DM_Sans'] text-sm text-[#0D1833]">
            Where should we send your results?
          </Label>
          <Input
            id="guest-identity-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
          />
        </div>
      )}
    </div>
  );
}
