import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isOnboardingIcpArrival,
  ONBOARDING_ICP_ARRIVAL_KEY,
  revealIcpSection,
  withOnboardingIcpArrival,
  withoutOnboardingIcpArrival,
} from "./onboardingIcpArrival";

describe("onboarding ICP arrival state", () => {
  it("reads only an explicit onboarding completion flag", () => {
    expect(isOnboardingIcpArrival(null)).toBe(false);
    expect(isOnboardingIcpArrival({ unsavedPreview: true })).toBe(false);
    expect(isOnboardingIcpArrival({ [ONBOARDING_ICP_ARRIVAL_KEY]: true })).toBe(true);
  });

  it("adds and strips the flag without dropping other state", () => {
    const withFlag = withOnboardingIcpArrival({ unsavedPreview: false });
    expect(withFlag).toEqual({ unsavedPreview: false, fromOnboardingIcp: true });
    expect(withoutOnboardingIcpArrival(withFlag)).toEqual({ unsavedPreview: false });
    expect(withoutOnboardingIcpArrival({ fromOnboardingIcp: true })).toBeNull();
  });
});

describe("revealIcpSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  function mountSection() {
    const el = document.createElement("section");
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    return el;
  }

  it("smooth-scrolls and fades the outline when motion is allowed", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false })
    );
    const el = mountSection();
    const cleanup = revealIcpSection(el);

    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(el.classList.contains("icp-arrival-highlight")).toBe(true);
    expect(el.getAttribute("data-armed")).toBe("true");
    expect(el.getAttribute("data-fade")).toBeNull();

    cleanup();
    expect(el.classList.contains("icp-arrival-highlight")).toBe(false);
  });

  it("jumps and skips the fade when reduced motion is preferred", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true })
    );
    const el = mountSection();
    revealIcpSection(el);

    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(el.classList.contains("icp-arrival-highlight")).toBe(true);
    expect(el.hasAttribute("data-fade")).toBe(false);
  });
});
