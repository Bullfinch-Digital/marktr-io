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
        className="mt-0.5 border-black"
      />
      <label htmlFor={id} className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
        I agree to the{" "}
        <Link to={TERMS_PATH} className="underline text-foreground" target="_blank" rel="noopener noreferrer">
          Terms of Use
        </Link>
        ,{" "}
        <Link to={PRIVACY_POLICY_PATH} className="underline text-foreground" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>
        , and{" "}
        <Link to={COOKIE_POLICY_PATH} className="underline text-foreground" target="_blank" rel="noopener noreferrer">
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
      <Link to={TERMS_PATH} className="underline text-foreground">
        Terms of Use
      </Link>
      ,{" "}
      <Link to={PRIVACY_POLICY_PATH} className="underline text-foreground">
        Privacy Policy
      </Link>
      , and{" "}
      <Link to={COOKIE_POLICY_PATH} className="underline text-foreground">
        Cookie Policy
      </Link>
      .
    </p>
  );
}

export const LEGAL_AGREEMENT_REQUIRED_MESSAGE =
  "Please agree to the Terms of Use, Privacy Policy, and Cookie Policy to continue.";
