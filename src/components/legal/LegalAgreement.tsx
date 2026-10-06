import { Link } from "react-router-dom";
import { Checkbox } from "../ui/checkbox";
import {
  COOKIE_POLICY_PATH,
  PRIVACY_POLICY_PATH,
  PRODUCT_NAME,
  TERMS_PATH,
} from "../../lib/legal";

type LegalAgreementCheckboxProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** Required before account creation or starting a paid trial. */
export function LegalAgreementCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
}: LegalAgreementCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="auth-modal-check mt-0.5 size-5 shrink-0 rounded-[6px] border-2 border-[#101A26] bg-white shadow-none data-[state=checked]:border-[#101A26] data-[state=checked]:bg-[#101A26] data-[state=checked]:text-[#EBFD84] focus-visible:border-[#101A26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101A26] focus-visible:ring-0"
      />
      <label htmlFor={id} className="cursor-pointer font-['Plus_Jakarta_Sans'] text-xs leading-[1.5] text-[#101A26]/75">
        I agree to the{" "}
        <Link to={TERMS_PATH} className="text-[#101A26] underline" target="_blank" rel="noopener noreferrer">
          Terms of Use
        </Link>
        ,{" "}
        <Link to={PRIVACY_POLICY_PATH} className="text-[#101A26] underline" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>
        , and{" "}
        <Link to={COOKIE_POLICY_PATH} className="text-[#101A26] underline" target="_blank" rel="noopener noreferrer">
          Cookie Policy
        </Link>
        .
      </label>
    </div>
  );
}

/** Informational copy where the user continues without creating a password yet. */
export function LegalAgreementNotice() {
  return (
    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
      By continuing, you agree to {PRODUCT_NAME}&apos;s{" "}
      <Link to={TERMS_PATH} className="text-[#101A26] underline">
        Terms of Use
      </Link>
      ,{" "}
      <Link to={PRIVACY_POLICY_PATH} className="text-[#101A26] underline">
        Privacy Policy
      </Link>
      , and{" "}
      <Link to={COOKIE_POLICY_PATH} className="text-[#101A26] underline">
        Cookie Policy
      </Link>
      .
    </p>
  );
}

export const LEGAL_AGREEMENT_REQUIRED_MESSAGE =
  "Please agree to the Terms of Use, Privacy Policy, and Cookie Policy to continue.";
