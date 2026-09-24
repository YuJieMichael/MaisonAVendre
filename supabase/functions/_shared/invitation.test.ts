import test from "node:test";
import assert from "node:assert/strict";
import {
  invitationConfig,
  invitationInput,
  readSmallJson,
} from "./invitation.ts";
import { createInvitationHandler } from "./invite-handler.ts";

test("invitation URLs preserve the application path and reject unsafe configuration", () => {
  assert.deepEqual(invitationConfig("https://example.com/propriete-en-vente"), {
    origin: "https://example.com",
    redirectTo: "https://example.com/propriete-en-vente/#auth/callback",
  });
  assert.equal(
    invitationConfig("http://127.0.0.1:5173").redirectTo,
    "http://127.0.0.1:5173/#auth/callback",
  );
  for (const value of [
    undefined,
    "http://example.com",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "https://example.com/?redirect=evil",
    "https://example.com/#admin",
  ]) {
    assert.throws(() => invitationConfig(value));
  }
});

test("invitation input only allows a valid email and the operator role", () => {
  assert.deepEqual(
    invitationInput({ email: " Team@Example.com ", role: "operator" }),
    { email: "team@example.com", role: "operator" },
  );
  for (const value of [
    null,
    [],
    { email: "a@example.com", role: "owner" },
    {
      email: "a@example.com",
      role: "operator",
      redirectTo: "https://evil.com",
    },
    { email: "no-email", role: "operator" },
    { email: "a@example.com\nBcc:x@evil.com", role: "operator" },
    { email: "a".repeat(255) + "@example.com", role: "operator" },
  ]) {
    assert.equal(invitationInput(value), null);
  }
});

test("JSON body parser enforces size even without a Content-Length header", async () => {
  await assert.rejects(
    readSmallJson(
      new Request("https://api.example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "x".repeat(5000) }),
      }),
    ),
  );
  await assert.rejects(
    readSmallJson(
      new Request("https://api.example.com", { method: "POST", body: "{}" }),
    ),
  );
  assert.deepEqual(
    await readSmallJson(
      new Request("https://api.example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"role":"operator"}',
      }),
    ),
    { role: "operator" },
  );
});

type Scenario = {
  emailSession?: boolean;
  aal?: string;
  role?: string;
  active?: boolean;
  verified?: boolean;
  identityError?: boolean;
  claimError?: boolean;
  claimUser?: string;
  inviteError?: boolean;
  assignmentError?: boolean;
};
function scenario(options: Scenario = {}) {
  const calls: { name: string; args: unknown[] }[] = [];
  const fake = {
    auth: {
      getUser: async (token: string) => {
        calls.push({ name: "getUser", args: [token] });
        return {
          data: {
            user: options.identityError
              ? null
              : {
                  id: "owner-id",
                  email: "owner@example.com",
                  email_confirmed_at:
                    options.verified === false ? null : "2026-01-01",
                },
          },
          error: options.identityError ? new Error("untrusted") : null,
        };
      },
      getClaims: async (token: string) => {
        calls.push({ name: "getClaims", args: [token] });
        return {
          data: {
            claims: {
              sub: options.claimUser || "owner-id",
              aal: options.aal || "aal2",
              session_id: "00000000-0000-4000-8000-000000000001",
            },
          },
          error: options.claimError ? new Error("bad signature") : null,
        };
      },
      admin: {
        inviteUserByEmail: async (...args: unknown[]) => {
          calls.push({ name: "invite", args });
          return {
            data: { user: options.inviteError ? null : { id: "invited-id" } },
            error: options.inviteError
              ? { code: "email_exists", message: "PRIVATE AUTH ERROR" }
              : null,
          };
        },
      },
    },
    from: (name: string) => {
      calls.push({ name: "from", args: [name] });
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                role: options.role || "owner",
                active: options.active !== false,
              },
              error: null,
            }),
          }),
        }),
      };
    },
    rpc: async (...args: unknown[]) => {
      calls.push({ name: "rpc", args });
      if (args[0] === 'check_staff_email_session') return {data:options.emailSession === true,error:null};
      return {
        error: options.assignmentError
          ? { code: "23505", message: "PRIVATE DATABASE ERROR" }
          : null,
      };
    },
  };
  const runtime: Parameters<typeof createInvitationHandler>[0] = {
    env: (name) =>
      ({
        APP_ORIGIN: "https://example.com/propriete-en-vente/",
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "private-test-key",
      })[name],
    createClient: () =>
      fake as unknown as ReturnType<
        Parameters<typeof createInvitationHandler>[0]["createClient"]
      >,
    log: () => {},
  };
  return { handler: createInvitationHandler(runtime), calls };
}
function request(
  body: unknown = { email: "staff@example.com", role: "operator" },
  headers: Record<string, string> = {},
) {
  return new Request("https://project.supabase.co/functions/v1/invite-staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
      Authorization: "Bearer signed-token",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("owner with verified MFA creates an operator and audit through the atomic RPC", async () => {
  const { handler, calls } = scenario();
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(
    result.headers.get("Access-Control-Allow-Origin"),
    "https://example.com",
  );
  assert.ok(calls.some((call) => call.name === "getUser"));
  assert.ok(calls.some((call) => call.name === "getClaims"));
  assert.deepEqual(calls.find((call) => call.name === "invite")?.args, [
    "staff@example.com",
    { redirectTo: "https://example.com/propriete-en-vente/#auth/callback" },
  ]);
  assert.deepEqual(calls.find((call) => call.name === "rpc")?.args, [
    "finish_staff_invite",
    { p_actor_id: "owner-id", p_invited_user_id: "invited-id" },
  ]);
});

test('owner with a server-verified email session may invite; ordinary AAL1 may not',async()=>{
  const {handler,calls}=scenario({aal:'aal1',emailSession:true});
  assert.equal((await handler(request())).status,200);
  assert.ok(calls.some(c=>c.name==='rpc' && c.args[0]==='check_staff_email_session'));
  const denied=scenario({aal:'aal1',emailSession:false});
  assert.equal((await denied.handler(request())).status,403);
  assert.ok(!denied.calls.some(c=>c.name==='invite'));
});

for (const [label, options] of Object.entries({
  "operator role": { role: "operator" },
  "inactive owner": { active: false },
  "aal1 owner": { aal: "aal1" },
  "unconfirmed email": { verified: false },
  "invalid identity": { identityError: true },
  "forged aal2 claims": { claimError: true },
  "mismatched claim identity": { claimUser: "another-user" },
})) {
  test(`${label} cannot send an invitation`, async () => {
    const { handler, calls } = scenario(options);
    const result = await handler(request());
    assert.ok([401, 403].includes(result.status));
    assert.equal(
      calls.some((call) => call.name === 'invite' || (call.name === 'rpc' && call.args[0] === 'finish_staff_invite')),
      false,
    );
  });
}

test("unknown origins and missing bearer authentication are rejected before staff operations", async () => {
  for (const headers of [
    { Origin: "https://evil.example" },
    { Authorization: "" },
  ]) {
    const { handler, calls } = scenario();
    const result = await handler(request(undefined, headers));
    assert.ok([401, 403].includes(result.status));
    assert.equal(calls.length, 0);
  }
});

test("an owner cannot request another owner role or a caller-chosen redirect", async () => {
  for (const body of [
    { email: "staff@example.com", role: "owner" },
    {
      email: "staff@example.com",
      role: "operator",
      redirectTo: "https://evil.example",
    },
  ]) {
    const { handler, calls } = scenario();
    assert.equal((await handler(request(body))).status, 400);
    assert.equal(
      calls.some((call) => call.name === "invite"),
      false,
    );
  }
});

test("failed email creation never assigns staff; internal errors stay private", async () => {
  const { handler, calls } = scenario({ inviteError: true });
  const result = await handler(request());
  const text = await result.text();
  assert.equal(result.status, 409);
  assert.equal(
    calls.some((call) => call.name === "rpc"),
    false,
  );
  assert.doesNotMatch(text, /PRIVATE|email_exists|private-test-key/);
});

test("failed assignment reports failure after email, never a false success", async () => {
  const { handler } = scenario({ assignmentError: true });
  const result = await handler(request());
  assert.equal(result.status, 409);
  const body = await result.json();
  assert.equal(body.error, "invitation_not_completed");
  assert.equal(body.ok, undefined);
});

test("preflight is CORS-only and a GET cannot initiate an invitation", async () => {
  const { handler, calls } = scenario();
  assert.equal(
    (
      await handler(
        new Request("https://api.example.com", {
          method: "OPTIONS",
          headers: { Origin: "https://example.com" },
        }),
      )
    ).status,
    204,
  );
  assert.equal(
    (
      await handler(
        new Request("https://api.example.com", {
          headers: { Origin: "https://example.com" },
        }),
      )
    ).status,
    405,
  );
  assert.equal(calls.length, 0);
});
