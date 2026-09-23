// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const mock = vi.hoisted(() => ({
  configured: true,
  session: null as Session | null,
  callbacks: new Set<(event: string, session: Session | null) => void>(),
  rpc: vi.fn(), getSession: vi.fn(), signOut: vi.fn(), assurance: vi.fn(),
  factors: vi.fn(), enroll: vi.fn(), verify: vi.fn(), exchange: vi.fn(), setSession: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  get backendConfigured() { return mock.configured; },
  get supabase() { return mock.configured ? {
    rpc: mock.rpc,
    auth: {
      getSession: mock.getSession, signOut: mock.signOut,
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        mock.callbacks.add(callback);
        return { data: { subscription: { unsubscribe: () => mock.callbacks.delete(callback) } } };
      },
      exchangeCodeForSession: mock.exchange, setSession: mock.setSession,
      mfa: { getAuthenticatorAssuranceLevel: mock.assurance, listFactors: mock.factors, enroll: mock.enroll, challengeAndVerify: mock.verify },
    },
  } : null; },
  authCallbackUrl: () => "http://localhost/#auth/callback",
}));
import { AuthPage, AuthProvider, MfaPanel, useAuth } from "../src/auth";
import { AdminPage } from "../src/admin";

let root: Root;
let container: HTMLDivElement;
let state: ReturnType<typeof useAuth>;
function Probe() { state = useAuth(); return null; }
function session(id: string): Session {
  return { user: { id, email: `${id}@example.test` }, access_token: `token-${id}`, refresh_token: `refresh-${id}`, token_type: "bearer", expires_in: 3600 } as Session;
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 12)); }); }
async function emit(event: string, next: Session | null) {
  await act(async () => { mock.session = next; for (const callback of mock.callbacks) callback(event, next); });
  await flush();
}
async function render(child = <AuthPage lang="en" />, strict = false) {
  const app = <AuthProvider><Probe />{child}</AuthProvider>;
  await act(async () => root.render(strict ? <StrictMode>{app}</StrictMode> : app));
  await flush();
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mock.exchange.mockReset(); mock.setSession.mockReset(); mock.enroll.mockReset(); mock.verify.mockReset();
  mock.callbacks.clear(); mock.session = null; mock.configured = true;
  mock.rpc.mockResolvedValue({ data: null, error: null });
  mock.getSession.mockImplementation(async () => ({ data: { session: mock.session }, error: null }));
  mock.assurance.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
  mock.factors.mockResolvedValue({ data: { totp: [], all: [] }, error: null });
  window.history.replaceState(null, "", "/#login");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe("authentication boundaries", () => {
  it("shows an honest unavailable state without backend settings", async () => {
    mock.configured = false;
    await render();
    expect(container.textContent).toContain("Sign-in has not been configured yet");
    expect(container.querySelector("form")).toBeNull();
    expect(state.user).toBeNull();
  });

  it("does not allow a normal signed-in session to masquerade as password recovery", async () => {
    mock.session = session("seller");
    window.history.replaceState(null, "", "/#reset-password");
    await render();
    expect(container.textContent).toContain("This link is invalid or has expired");
    expect(container.querySelector("input[type=password]")).toBeNull();
  });

  it("requires a real recovery event and preserves it through same-user tab-focus events", async () => {
    const seller = session("seller");
    window.history.replaceState(null, "", "/#reset-password");
    await render();
    await emit("PASSWORD_RECOVERY", seller);
    expect(container.querySelectorAll("input[type=password]")).toHaveLength(2);
    await emit("SIGNED_IN", seller);
    expect(state.recoverySession).toBe(true);
    await emit("SIGNED_IN", session("another-seller"));
    expect(state.recoverySession).toBe(false);
    expect(container.querySelector("input[type=password]")).toBeNull();
  });

  it("discards late administrator permissions after an account switch", async () => {
    let resolveOld!: (value: { data: string; error: null }) => void;
    mock.session = session("owner");
    mock.rpc.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await render();
    await emit("SIGNED_IN", session("seller"));
    await act(async () => resolveOld({ data: "owner", error: null }));
    await flush();
    expect(state.user?.id).toBe("seller");
    expect(state.staffRole).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("fails closed and reports a permissions service error", async () => {
    mock.session = session("owner");
    mock.rpc.mockResolvedValue({ data: null, error: { message: "Permissions unavailable" } });
    await render();
    expect(state.staffRole).toBeNull();
    expect(state.error).toBe("Permissions unavailable");
  });

  it("shows a retryable administrator permission error instead of a no-access verdict", async () => {
    mock.session = session("owner");
    mock.rpc.mockResolvedValue({ data: null, error: { message: "Permissions unavailable" } });
    await render(<AdminPage lang="en" />);
    expect(container.querySelector("[role=alert]")).not.toBeNull();
    expect(container.textContent).not.toContain("This account is not an active staff account");
    const retry = container.querySelector<HTMLButtonElement>("button");
    expect(retry?.textContent).toContain("Refresh");
    mock.rpc.mockResolvedValue({ data: "owner", error: null });
    await act(async () => retry!.click());
    await flush();
    expect(state.error).toBeNull();
    expect(container.textContent).toContain("Protect your administrator access");
  });

  it("does not claim a successful logout when the server rejects it", async () => {
    mock.session = session("seller");
    mock.signOut.mockResolvedValue({ error: { message: "Sign-out failed" } });
    await render();
    await act(async () => { await expect(state.signOut()).rejects.toMatchObject({ message: "Sign-out failed" }); });
    expect(state.user?.id).toBe("seller");
    expect(state.error).toBe("Sign-out failed");
  });

  it("exchanges a PKCE callback once under StrictMode and removes its code from the URL", async () => {
    const seller = session("recovered");
    mock.exchange.mockImplementation(async () => {
      mock.session = seller;
      for (const callback of mock.callbacks) callback("PASSWORD_RECOVERY", seller);
      return { data: { session: seller }, error: null };
    });
    window.history.replaceState(null, "", "/?code=single-use-test-code#auth/callback");
    await render(<AuthPage lang="en" />, true);
    expect(mock.exchange).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#reset-password");
    expect(state.recoverySession).toBe(true);
  });

  it("reuses an existing verified MFA factor and never enrolls automatically", async () => {
    mock.session = session("owner");
    mock.rpc.mockResolvedValue({ data: "owner", error: null });
    mock.factors.mockResolvedValue({ data: { totp: [{ id: "existing", status: "verified" }], all: [] }, error: null });
    await render(<MfaPanel lang="en" />);
    expect(container.querySelector("input[name=totp]")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(mock.enroll).not.toHaveBeenCalled();
  });

  it("sends a normal confirmation callback to the dashboard without enabling password recovery", async () => {
    const seller = session("confirmed");
    mock.exchange.mockImplementation(async () => {
      mock.session = seller;
      for (const callback of mock.callbacks) callback("SIGNED_IN", seller);
      return { data: { session: seller }, error: null };
    });
    window.history.replaceState(null, "", "/?code=confirmation-code#auth/callback");
    await render();
    expect(window.location.hash).toBe("#dashboard");
    expect(state.recoverySession).toBe(false);
  });

  it("validates invitation tokens and opens the separate password-setup route", async () => {
    const staff = session("invited-staff");
    mock.setSession.mockImplementation(async () => {
      mock.session = staff;
      for (const callback of mock.callbacks) callback("SIGNED_IN", staff);
      return { data: { session: staff }, error: null };
    });
    window.history.replaceState(null, "", "/#access_token=invite-token&refresh_token=invite-refresh&type=invite");
    await render();
    expect(mock.setSession).toHaveBeenCalledWith({ access_token: "invite-token", refresh_token: "invite-refresh" });
    expect(window.location.hash).toBe("#set-password");
    expect(state.invitationSession).toBe(true);
    expect(state.recoverySession).toBe(false);
    expect(container.querySelectorAll("input[type=password]")).toHaveLength(2);
  });

  it("rejects invalid invitation tokens and removes them from the address", async () => {
    mock.setSession.mockResolvedValue({ data: { session: null }, error: { message: "Invalid token" } });
    window.history.replaceState(null, "", "/#access_token=invalid-token&refresh_token=invalid-refresh&type=invite");
    await render();
    expect(window.location.hash).toBe("#auth/callback");
    expect(state.invitationSession).toBe(false);
    expect(state.user).toBeNull();
    expect(state.callbackError).toBe("Invalid token");
  });

  it("offers safe recovery after a missing PKCE verifier without granting access or showing SDK internals", async () => {
    mock.exchange.mockResolvedValue({ data: { session: null }, error: { message: "PKCE code verifier not found in storage. Use @supabase/ssr." } });
    window.history.replaceState(null, "", "/?code=missing-verifier-test#auth/callback");
    await render(<AuthPage lang="zh" />, true);
    expect(window.location.search).toBe("");
    expect(state.user).toBeNull();
    expect(state.recoverySession).toBe(false);
    expect(state.invitationSession).toBe(false);
    expect(container.textContent).toContain("链接登录未完成");
    expect(container.textContent).toContain("同一个浏览器");
    expect(container.textContent).not.toContain("PKCE");
    expect(container.textContent).not.toContain("@supabase/ssr");
    expect(container.querySelector('a[href="#login"]')).not.toBeNull();
    expect(container.querySelector('a[href="#forgot-password"]')).not.toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });
});
