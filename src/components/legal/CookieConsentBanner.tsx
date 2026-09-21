import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { COOKIE_POLICY_PATH } from "../../lib/legal";
import { readCookieConsent, saveCookieConsent } from "../../lib/cookieConsent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readCookieConsent());
  }, []);

  if (!visible) return null;

  const accept = (analytics: boolean) => {
    saveCookieConsent(analytics);
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-black bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] sm:p-6"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="container mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p id="cookie-consent-title" className="font-['Fraunces'] text-lg font-bold text-text-dark">
            Cookies on marktr
          </p>
          <p id="cookie-consent-desc" className="mt-2 text-sm text-foreground/80 leading-relaxed">
            We use essential cookies to run the site and, with your consent, analytics cookies to
            understand how marktr is used. You can change your mind anytime in your browser or read
            our{" "}
            <Link to={COOKIE_POLICY_PATH} className="underline text-foreground">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => accept(false)}
            className="rounded-design border-black font-['DM_Sans']"
          >
            Reject non-essential
          </Button>
          <Button
            type="button"
            onClick={() => accept(true)}
            className="rounded-design border border-black bg-button-green font-['Fraunces'] font-bold text-text-dark hover:bg-button-green/90"
          >
            Accept all cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
