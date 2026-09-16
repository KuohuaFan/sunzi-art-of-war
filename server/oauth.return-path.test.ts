import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "../shared/const";
import { safeOAuthReturnPath } from "./_core/oauth";

describe("event journal OAuth return path", () => {
  it("round-trips the event journal path through signed-in state data", () => {
    const encoded = encodeOAuthState({
      redirectUri: "https://example.test/api/oauth/callback",
      nonce: "nonce-1",
      returnPath: "/events/12",
    });
    expect(decodeOAuthState(encoded)).toMatchObject({ returnPath: "/events/12", nonce: "nonce-1" });
  });

  it("allows same-site paths and rejects protocol-relative or external redirects", () => {
    expect(safeOAuthReturnPath("/events")).toBe("/events");
    expect(safeOAuthReturnPath("/events/12?tab=history")).toBe("/events/12?tab=history");
    expect(safeOAuthReturnPath("//evil.example/path")).toBe("/");
    expect(safeOAuthReturnPath("https://evil.example/path")).toBe("/");
    expect(safeOAuthReturnPath(undefined)).toBe("/");
  });
});
