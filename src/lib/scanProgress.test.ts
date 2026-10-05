import { describe, expect, it } from "vitest";
import { editionConfig } from "./editionConfig";
import { missingSocialPictureNote } from "./missingSocialChannels";
import {
  SCAN_CHECKLIST_STEP_MS,
  SCAN_LINE_INTERVAL_MS,
  SCAN_REASSURANCE,
  activeChecklistIndex,
  scanStatusLine,
  visibleScanChecklist,
} from "./scanProgress";

const POOL = ["one", "two", "three"];

describe("scan progress", () => {
  it("shows each line once, then holds the last line until reassurance is due", () => {
    expect(scanStatusLine(POOL, 0)).toBe("one");
    expect(scanStatusLine(POOL, SCAN_LINE_INTERVAL_MS)).toBe("two");
    expect(scanStatusLine(POOL, SCAN_LINE_INTERVAL_MS * 2)).toBe("three");
    expect(scanStatusLine(POOL, SCAN_LINE_INTERVAL_MS * 3)).toBe("three");
    expect(scanStatusLine(POOL, 24_000)).toBe("three");
    expect(scanStatusLine(POOL, SCAN_REASSURANCE[0].atMs)).toBe(SCAN_REASSURANCE[0].text);
    expect(scanStatusLine(POOL, SCAN_REASSURANCE[1].atMs)).toBe(SCAN_REASSURANCE[1].text);
    expect(scanStatusLine(POOL, SCAN_REASSURANCE[2].atMs)).toBe(SCAN_REASSURANCE[2].text);
    expect(scanStatusLine(POOL, 90_000)).toBe(SCAN_REASSURANCE[2].text);
  });

  it("drops the Instagram line unless a handle was given", () => {
    const lines = editionConfig.bullfinch.scanLines;
    const without = lines.filter((line) => line.when !== "instagram").map((line) => line.text);
    const withIg = lines.filter((line) => line.when !== "instagram" || true).map((line) => line.text);
    expect(without.some((line) => line.includes("Instagram"))).toBe(false);
    expect(withIg.some((line) => line.includes("Instagram"))).toBe(true);
    expect(new Set(withIg).size).toBe(withIg.length);
  });

  it("ticks the checklist one step at a time and leaves the last step active", () => {
    const withSocial = visibleScanChecklist(true);
    const withoutSocial = visibleScanChecklist(false);
    expect(withSocial.map((item) => item.label)).toContain("Analysing social presence");
    expect(withoutSocial.map((item) => item.label)).not.toContain("Analysing social presence");
    expect(activeChecklistIndex(0, withSocial.length)).toBe(0);
    expect(activeChecklistIndex(SCAN_CHECKLIST_STEP_MS, withSocial.length)).toBe(1);
    expect(activeChecklistIndex(SCAN_CHECKLIST_STEP_MS * 20, withSocial.length)).toBe(withSocial.length - 1);
  });
});

describe("missing social channels", () => {
  it("names only the channel that was not entered", () => {
    expect(missingSocialPictureNote("@cafe", "")).toBe("Add your Facebook page for a complete picture.");
    expect(missingSocialPictureNote("", "https://facebook.com/cafe")).toBe(
      "Add your Instagram for a complete picture.",
    );
    expect(missingSocialPictureNote("@cafe", "https://facebook.com/cafe")).toBeNull();
    expect(missingSocialPictureNote("", "")).toBeNull();
  });
});
