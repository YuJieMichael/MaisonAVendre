import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ auth: {} })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
import { validPublicConfig } from "../src/lib/supabase";

const url = "https://example-project.supabase.co";
const publicKey = "sb_publishable_example_public_key";
const jwt = (role: string) => {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
};
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("browser Supabase configuration", () => {
  it("accepts publishable keys and legacy anon keys", () => {
    expect(validPublicConfig(url, publicKey)).toBe(true);
    expect(validPublicConfig(url, jwt("anon"))).toBe(true);
  });
  it.each([
    "sb_secret_server_only", jwt("service_role"), jwt("authenticated"),
    "sb_publishable_", "not-a-key", "header.invalid!.signature", "", undefined,
  ])("rejects non-public or malformed key %s", key => {
    expect(validPublicConfig(url, key)).toBe(false);
  });
  it("permits HTTP only on local development hosts", () => {
    expect(validPublicConfig("http://localhost:54321", publicKey)).toBe(true);
    expect(validPublicConfig("http://127.0.0.1:54321", publicKey)).toBe(true);
    expect(validPublicConfig("http://remote.example", publicKey)).toBe(false);
    expect(validPublicConfig("javascript:alert(1)", publicKey)).toBe(false);
    expect(validPublicConfig("https://name:password@example.test", publicKey)).toBe(false);
  });
  it("does not construct a browser client with a server-role key", async () => {
    vi.resetModules(); createClient.mockClear();
    vi.stubEnv("VITE_SUPABASE_URL", url);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", jwt("service_role"));
    const module = await import("../src/lib/supabase");
    expect(module.backendConfigured).toBe(false);
    expect(module.supabase).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
  it("constructs a PKCE client only for a valid public configuration", async () => {
    vi.resetModules(); createClient.mockClear();
    vi.stubEnv("VITE_SUPABASE_URL", url);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", publicKey);
    const module = await import("../src/lib/supabase");
    expect(module.backendConfigured).toBe(true);
    expect(createClient).toHaveBeenCalledWith(url, publicKey, expect.objectContaining({ auth: expect.objectContaining({ flowType: "pkce", detectSessionInUrl: false }) }));
  });
});
