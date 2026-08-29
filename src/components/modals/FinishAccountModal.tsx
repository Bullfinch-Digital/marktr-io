import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../config/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "../../contexts/AuthContext";
import {
  buildLinkBody,
  clearPendingGuestLink,
  getPendingGuestLink,
  setPendingGuestLink,
} from "../../utils/pendingGuestLink";
import {
  LegalAgreementCheckbox,
} from "../legal/LegalAgreement";
import { createLegalAcceptanceRecord } from "../../lib/legal";
import { LegalAgreementRequiredModal } from "../legal/LegalAgreementRequiredModal";
import { useLegalAgreementGate } from "../../hooks/useLegalAgreementGate";

type FinishAccountModalProps = {
  isOpen: boolean;
  guestRef?: string | null;
  onClose: () => void;
  onOpenLogin: (payload: {
    email?: string | null;
    guestRef?: string | null;
    sessionId?: string | null;
  }) => void;
};

type GuestCheckResponse = {
  email: string | null;
  guest_ref: string;
  user_exists: boolean;
  linked_user_id: string | null;
};

export function FinishAccountModal({
  isOpen,
  guestRef,
  onClose,
  onOpenLogin,
}: FinishAccountModalProps) {
  const { user } = useAuth();
  const isAnonymous = Boolean((user as any)?.is_anonymous);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [legalAgreed, setLegalAgreed] = useState(true);
  const { open: legalModalOpen, gate, closeModal, confirmAgreement } = useLegalAgreementGate();
  const [debugDetails, setDebugDetails] = useState<any>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const guestRefFromUrl = params.get("guest_ref") ?? "";
  const sessionId = params.get("session_id") ?? "";
  const resolvedGuestRef = guestRef || guestRefFromUrl;

  const loadCheckoutDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFormError(null);
    setSuccess(null);
    setDebugDetails(null);

    if (isAnonymous) {
      setLoading(false);
      return;
    }

    if (!resolvedGuestRef && !sessionId) {
      setLoading(false);
      setError("Missing checkout reference. Please try checkout again.");
      return;
    }

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(
        "get-guest-checkout",
        {
          body: { guest_ref: resolvedGuestRef, session_id: sessionId || undefined },
        }
      );

      if (fetchError) {
        setDebugDetails({ step: "get-guest-checkout", error: fetchError });
        throw fetchError;
      }

      const checkout = (data as any)?.checkout ?? (data as any)?.data ?? null;
      if (!checkout) {
        setDebugDetails({ step: "get-guest-checkout", data });
        throw new Error("No checkout details returned");
      }

      setEmail(checkout?.email ?? null);
      setUserExists(false);
      setLinkedUserId(null);
      setLoading(false);
      return;
    } catch {
      // fall through to check-guest-checkout
    }

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(
        "check-guest-checkout",
        {
          body: { guest_ref: resolvedGuestRef, session_id: sessionId || undefined },
        }
      );

      if (fetchError) {
        setDebugDetails({ step: "check-guest-checkout", error: fetchError });
        throw fetchError;
      }

      const payload = data as GuestCheckResponse;
      setEmail(payload?.email ?? null);
      setUserExists(Boolean(payload?.user_exists));
      setLinkedUserId(payload?.linked_user_id ?? null);
      setLoading(false);
    } catch (err: any) {
      console.error("[FinishAccountModal] Failed to load checkout details", err);
      setLoading(false);
      setError("We couldn't load your checkout details.");
      setDebugDetails((prev: any) => prev ?? { err: err?.message ?? String(err) });
    }
  }, [resolvedGuestRef, sessionId, isAnonymous]);

  useEffect(() => {
    if (!isOpen) return;
    if (isAnonymous) return;
    void loadCheckoutDetails();
  }, [isOpen, loadCheckoutDetails, isAnonymous]);

  useEffect(() => {
    if (!isOpen) return;

    const pending = getPendingGuestLink();
    if (pending?.email && !email) setEmail(pending.email);
  }, [isOpen, email]);

  const syncPendingLink = useCallback(
    (overrideEmail?: string | null) => {
      setPendingGuestLink({
        guestRef: resolvedGuestRef || undefined,
        sessionId: sessionId || undefined,
        email: overrideEmail !== undefined ? overrideEmail : email ?? undefined,
      });
    },
    [resolvedGuestRef, sessionId, email]
  );

  const getLoginPayload = useCallback(() => {
    const pending = getPendingGuestLink();
    return {
      email: email ?? pending?.email ?? null,
      guestRef: resolvedGuestRef || pending?.guestRef || null,
      sessionId: sessionId || pending?.sessionId || null,
    };
  }, [email, resolvedGuestRef, sessionId]);

  const tryLinkNow = useCallback(async () => {
    syncPendingLink();
    const linkBody = buildLinkBody();
    if (!linkBody.guest_ref && !linkBody.session_id) {
      throw new Error("Missing checkout reference. Please try checkout again.");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = Boolean(sessionData?.session);

    if (!hasSession) {
      // no session yet - store pending and tell user what to do
      syncPendingLink();
      throw new Error(
        "Your account was created, but we need you to confirm your email before we can unlock your trial. Please check your inbox, confirm your email, then come back."
      );
    }

    const { error: linkError } = await supabase.functions.invoke("link-guest-checkout", {
      body: linkBody,
    });

    if (linkError) throw linkError;

    clearPendingGuestLink();
    return true;
  }, [syncPendingLink]);

  if (!isOpen) return null;

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!email) {
      setFormError("Missing email.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    if (!isAnonymous && !resolvedGuestRef && !sessionId) {
      setFormError("Missing checkout reference. Please try the upgrade flow again.");
      return;
    }

    gate(legalAgreed, () => void runSignup());
  };

  const runSignup = async () => {
    if (!email) {
      setFormError("Missing email.");
      return;
    }

    const legal = createLegalAcceptanceRecord();

    setLoading(true);
    try {
      if (isAnonymous) {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
          data: {
            name: name.trim() || null,
            terms_accepted_at: legal.terms_accepted_at,
            privacy_accepted_at: legal.privacy_accepted_at,
            legal_version: legal.legal_version,
          },
        });

        if (updateError) {
          setFormError(updateError.message || "Unable to update account.");
          return;
        }

        if (user?.id) {
          await supabase
            .from("profiles")
            .update({
              email: email?.trim() || "",
              name: name.trim() || null,
              terms_accepted_at: legal.terms_accepted_at,
              privacy_accepted_at: legal.privacy_accepted_at,
              legal_version: legal.legal_version,
            })
            .eq("id", user.id);
        }

        setSuccess("Account updated. Redirecting…");
        window.setTimeout(() => {
          onClose();
          window.location.reload();
        }, 600);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim() || null,
            terms_accepted_at: legal.terms_accepted_at,
            privacy_accepted_at: legal.privacy_accepted_at,
            legal_version: legal.legal_version,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      // If signUp returns a session, great. If not, Supabase likely requires email confirmation.
      // We will attempt a sign-in, but if that fails due to confirmation, we store a pending link.
      const session = signUpData?.session ?? null;

      if (!session) {
        const { data: _signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });

        // Supabase often returns 400 with messages like "Email not confirmed"
        if (signInError) {
          const msg = (signInError as any)?.message ?? "";
          const looksLikeConfirm =
            /confirm|confirmed|verification|verify/i.test(msg) ||
            (signInError as any)?.status === 400;

          if (looksLikeConfirm) {
            // persist pending link and show "check inbox" UX
            syncPendingLink(email);

            setFormError(
              "Almost there — please check your inbox and confirm your email. Once confirmed, come back and log in to unlock your trial automatically."
            );
            return;
          }

          // other sign-in failure
          throw signInError;
        }

        // If sign-in succeeded we now have a session, so try linking immediately
        await tryLinkNow();
      } else {
        // signUp gave us a session, link immediately
        await tryLinkNow();
      }

      setSuccess("Your trial is unlocked. Redirecting…");
      window.setTimeout(() => {
        onClose();
        window.location.reload();
      }, 600);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6 text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
          <p className="font-['Inter'] text-sm text-foreground/70">
            Preparing your account…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
          <div className="space-y-3">
            <div className="text-red-600 font-['Inter']">{error}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-black rounded-design"
                onClick={() => loadCheckoutDetails()}
                disabled={loading}
              >
                {loading ? "Retrying..." : "Retry"}
              </Button>
              <Button
                className="bg-background border border-black rounded-design"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
            {import.meta.env.DEV && debugDetails && (
              <pre className="text-xs bg-accent-grey/20 border border-warm-grey rounded-design p-3 overflow-auto">
                {JSON.stringify(debugDetails, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!email && !isAnonymous) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6 text-center">
          <p className="font-['Inter'] text-sm text-foreground/70 mb-4">
            We couldn't find your checkout details.
          </p>
          <Button
            onClick={onClose}
            className="bg-button-green text-text-dark border border-black rounded-design px-6 py-3 font-['Fraunces']"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (linkedUserId || userExists) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
          <h2 className="font-['Fraunces'] text-2xl mb-2">
            Welcome Back
          </h2>
          <p className="font-['Inter'] text-sm text-foreground/70 mb-4">
            We found an account for {email}. Log in to access your ICP Dashboard.
          </p>
          <Button
            onClick={() => {
              syncPendingLink();
              onClose();
              onOpenLogin(getLoginPayload());
            }}
            className="w-full bg-button-green text-text-dark border border-black rounded-design px-6 py-4 font-['Fraunces']"
          >
            Log in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LegalAgreementRequiredModal
        open={legalModalOpen}
        onClose={closeModal}
        onAgree={() => confirmAgreement(setLegalAgreed)}
      />
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-['Fraunces'] text-2xl mb-1">
              Finish your account
            </h2>
            <p className="font-['Inter'] text-sm text-foreground/70">
              Your trial is ready — set a password to unlock it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="finish-email" className="font-medium">
              Email
            </Label>
            <Input
              id="finish-email"
              type="email"
              value={email ?? ""}
              readOnly={!isAnonymous}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-black rounded-design px-4 py-3 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finish-name" className="font-medium">
              Name (optional)
            </Label>
            <Input
              id="finish-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-black rounded-design px-4 py-3 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finish-password" className="font-medium">
              Password
            </Label>
            <Input
              id="finish-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-black rounded-design px-4 py-3 bg-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finish-confirm" className="font-medium">
              Confirm password
            </Label>
            <Input
              id="finish-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border border-black rounded-design px-4 py-3 bg-white"
              required
            />
          </div>

          {formError && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-['Inter']">{formError}</p>

              <Button
                type="button"
                variant="outline"
                className="w-full border-black rounded-design"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await tryLinkNow();
                    setSuccess("Your trial is unlocked. Redirecting…");
                    window.setTimeout(() => {
                      onClose();
                      window.location.reload();
                    }, 600);
                  } catch (e: any) {
                    setFormError(e?.message ?? "Still not signed in. Please log in first.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                I've confirmed — unlock my trial
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full border-black rounded-design"
                onClick={() => {
                  syncPendingLink();
                  onClose();
                  onOpenLogin(getLoginPayload());
                }}
                disabled={loading}
              >
                Log in
              </Button>
            </div>
          )}
          {success && (
            <p className="text-sm text-button-green font-['Inter']">{success}</p>
          )}

          <LegalAgreementCheckbox
            id="finish-account-legal"
            checked={legalAgreed}
            onCheckedChange={setLegalAgreed}
            disabled={loading}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-button-green text-text-dark border border-black rounded-design px-6 py-4 font-['Fraunces']"
          >
            {loading ? "Finishing…" : "Finish account"}
          </Button>
        </form>
      </div>
    </div>
    </>
  );
}
