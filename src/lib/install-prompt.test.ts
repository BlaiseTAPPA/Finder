import { describe, expect, it } from "vitest";
import { SNOOZE_MS, isIosSafari, shouldOfferInstall, type InstallState } from "./install-prompt";

const now = Date.parse("2026-10-16T10:00:00Z");
const used: InstallState = { dismissedAt: null, installed: false };

describe("shouldOfferInstall", () => {
  it("sofort, wenn der Browser installieren kann", () => {
    expect(shouldOfferInstall(used, "prompt", false, now)).toBe(true);
    expect(shouldOfferInstall(used, "ios", false, now)).toBe(true);
  });

  it("nie ohne Installationsweg, in der installierten App oder nach der Installation", () => {
    expect(shouldOfferInstall(used, null, false, now)).toBe(false);
    expect(shouldOfferInstall(used, "prompt", true, now)).toBe(false);
    expect(shouldOfferInstall({ ...used, installed: true }, "prompt", false, now)).toBe(false);
  });

  it("nach „Später“ 30 Tage Pause", () => {
    const dismissed = { ...used, dismissedAt: now - SNOOZE_MS + 60_000 };
    expect(shouldOfferInstall(dismissed, "prompt", false, now)).toBe(false);
    expect(shouldOfferInstall(dismissed, "prompt", false, now + 60_000)).toBe(true);
  });
});

describe("isIosSafari", () => {
  const iphoneSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const iphoneChrome =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
  const ipadDesktopMode =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

  it("erkennt Safari auf iPhone und iPad (auch im Desktop-Modus)", () => {
    expect(isIosSafari(iphoneSafari, 5)).toBe(true);
    expect(isIosSafari(ipadDesktopMode, 5)).toBe(true);
  });

  it("nicht: andere iOS-Browser, Mac ohne Touch, Android", () => {
    expect(isIosSafari(iphoneChrome, 5)).toBe(false);
    expect(isIosSafari(ipadDesktopMode, 0)).toBe(false);
    expect(isIosSafari(androidChrome, 5)).toBe(false);
  });
});
