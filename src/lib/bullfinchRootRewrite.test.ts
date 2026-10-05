import { describe, expect, it } from "vitest";
import middleware, { requestHostname } from "../../middleware";

function call(url: string, host?: string) {
  const headers = new Headers();
  if (host) headers.set("host", host);
  return middleware(new Request(url, { headers }));
}

describe("bullfinch root rewrite", () => {
  it("rewrites the check host root to bullfinch.html and keeps the query", () => {
    const response = call(
      "https://check.bullfinchdigital.com/?utm_source=x",
      "check.bullfinchdigital.com",
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://check.bullfinchdigital.com/bullfinch.html?utm_source=x",
    );
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("rewrites /index.html on the check host", () => {
    const response = call(
      "https://check.bullfinchdigital.com/index.html",
      "check.bullfinchdigital.com:443",
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://check.bullfinchdigital.com/bullfinch.html",
    );
  });

  it("leaves marktr and the preview host on index.html", () => {
    for (const host of [
      "marktr.io",
      "www.marktr.io",
      "marktr-app-git-bullfinch-preview-bullfinch-digital.vercel.app",
    ]) {
      const response = call(`https://${host}/?edition=bullfinch`, host);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("reads the hostname from the URL when the host header is missing", () => {
    expect(requestHostname({ url: "https://check.bullfinchdigital.com/", headers: { get: () => null } })).toBe(
      "check.bullfinchdigital.com",
    );
    expect(requestHostname({ url: "https://marktr.io/", headers: { get: () => null } })).toBe("marktr.io");
  });
});
