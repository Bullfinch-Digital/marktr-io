import { createContext, useContext, useMemo, useState } from "react";
import { LoginModal } from "../components/modals/LoginModal";
import { FinishAccountModal } from "../components/modals/FinishAccountModal";
import { SignInModal } from "../components/modals/SignInModal";
import { consumeAuthTrigger, peekAuthTrigger, rememberAuthTrigger, track } from "../lib/analytics";

type LoginPayload = {
  email?: string | null;
  guestRef?: string | null;
  sessionId?: string | null;
};

type FinishPayload = {
  guestRef?: string | null;
};

type SignInPayload = {
  redirectPath?: string;
  heading?: string;
  subheading?: string;
};

type AuthModalState =
  | { type: "login"; payload: LoginPayload }
  | { type: "finish"; payload: FinishPayload }
  | { type: "signin"; payload: SignInPayload }
  | null;

type AuthModalContextValue = {
  openLogin: (payload?: LoginPayload) => void;
  openFinishAccount: (payload?: FinishPayload) => void;
  openSignIn: (payload?: SignInPayload) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(
  undefined
);

export function AuthModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AuthModalState>(null);

  const openLogin = (payload?: LoginPayload, opts?: { skipAnalytics?: boolean }) => {
    if (!opts?.skipAnalytics) {
      const trigger = peekAuthTrigger("header");
      track("signup_prompt_shown", { trigger });
      track("signin_modal_open", { trigger: consumeAuthTrigger(trigger) });
    }
    setState({ type: "login", payload: payload ?? {} });
  };

  const openFinishAccount = (payload?: FinishPayload) => {
    rememberAuthTrigger("save_results");
    track("signup_prompt_shown", { trigger: "save_results" });
    track("signin_modal_open", { trigger: "save_results" });
    setState({ type: "finish", payload: payload ?? {} });
  };

  const openSignIn = (payload?: SignInPayload) => {
    const trigger = peekAuthTrigger("save_results");
    track("signup_prompt_shown", { trigger });
    track("signin_modal_open", { trigger: consumeAuthTrigger(trigger) });
    setState({ type: "signin", payload: payload ?? {} });
  };

  const closeAuthModal = () => setState(null);

  const value = useMemo(
    () => ({ openLogin, openFinishAccount, openSignIn, closeAuthModal }),
    []
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      <SignInModal
        isOpen={state?.type === "signin"}
        redirectPath={
          state?.type === "signin" ? state.payload.redirectPath : undefined
        }
        heading={state?.type === "signin" ? state.payload.heading : undefined}
        subheading={
          state?.type === "signin" ? state.payload.subheading : undefined
        }
        onClose={closeAuthModal}
        onEmailClick={() => openLogin(undefined, { skipAnalytics: true })}
      />

      <LoginModal
        isOpen={state?.type === "login"}
        email={state?.type === "login" ? state.payload.email ?? null : null}
        guestRef={state?.type === "login" ? state.payload.guestRef ?? null : null}
        sessionId={state?.type === "login" ? state.payload.sessionId ?? null : null}
        onClose={closeAuthModal}
      />

      <FinishAccountModal
        isOpen={state?.type === "finish"}
        guestRef={state?.type === "finish" ? state.payload.guestRef ?? null : null}
        onClose={closeAuthModal}
        onOpenLogin={(payload) => {
          openLogin(payload, { skipAnalytics: true });
        }}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return ctx;
}
