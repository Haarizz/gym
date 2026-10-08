import { describe, expect, it } from "vitest";
import { parseUserAgent } from "../terminalIdentity";

describe("parseUserAgent", () => {
  it("recognises Chrome on Windows", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"))
      .toEqual({ browser: "Chrome 140", os: "Windows 10/11" });
  });

  it("prefers Edge over the Chrome token it also carries", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/139.0 Safari/537.36 Edg/139.0").browser).toBe("Edge 139");
  });

  it("recognises Safari on iOS and Firefox on Linux", () => {
    expect(parseUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"))
      .toEqual({ browser: "Safari 17", os: "iOS" });
    expect(parseUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"))
      .toEqual({ browser: "Firefox 128", os: "Linux" });
  });

  it("falls back for unknown agents", () => {
    expect(parseUserAgent("")).toEqual({ browser: "Browser", os: "Unknown OS" });
  });
});
