import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.0";
import {
  invitationConfig,
  invitationInput,
  readSmallJson,
} from "./invitation.ts";

// The platform JWT gate is disabled for asymmetric signing-key compatibility.
// Both identity and cryptographically verified claims are checked below on EVERY request.
type Runtime = {
  env: (name: string) => string | undefined;
  createClient: (url: string, secret: string) => SupabaseClient;
  log: (event: { requestId: string; stage: string; code?: string }) => void;
};
export function createInvitationHandler(runtime: Runtime) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    let config: ReturnType<typeof invitationConfig>;
    try {
      config = invitationConfig(runtime.env("APP_ORIGIN"));
    } catch {
      return Response.json(
        { error: "service_unavailable", requestId },
        { status: 503 },
      );
    }
    const origin = request.headers.get("origin");
    const headers = {
      "Access-Control-Allow-Origin": config.origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    const respond = (status: number, error?: string) =>
      Response.json(error ? { error, requestId } : { ok: true }, {
        status,
        headers,
      });
    if (origin && origin !== config.origin) return respond(403, "forbidden");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return respond(405, "method_not_allowed");

    try {
      const url = runtime.env("SUPABASE_URL");
      const secret =
        runtime.env("SUPABASE_SERVICE_ROLE_KEY") ||
        runtime.env("SUPABASE_SECRET_KEY");
      if (!url || !secret) return respond(503, "service_unavailable");
      const authorization = request.headers.get("authorization");
      const match = authorization?.match(/^Bearer ([^\s]+)$/i);
      if (!match || match[1].length > 16384)
        return respond(401, "authentication_required");
      const token = match[1];
      const admin = runtime.createClient(url, secret);

      // getUser checks the user against Auth. getClaims verifies the JWT signature;
      // an unverified base64-decoded aal claim must never authorize staff operations.
      const [
        { data: userData, error: userError },
        { data: claimData, error: claimError },
      ] = await Promise.all([
        admin.auth.getUser(token),
        admin.auth.getClaims(token),
      ]);
      const user = userData.user;
      const claims = claimData?.claims;
      if (userError || claimError || !user || !claims || claims.sub !== user.id)
        return respond(401, "authentication_required");
      if (!user.email_confirmed_at)
        return respond(403, "forbidden");
      if (claims.aal !== "aal2") {
        if (typeof claims.session_id !== "string") return respond(403, "forbidden");
        const { data: verified, error: checkError } = await admin.rpc("check_staff_email_session", {
          p_user_id: user.id, p_session_id: claims.session_id,
        });
        if (checkError || verified !== true) return respond(403, "forbidden");
      }
      const { data: staff, error: staffError } = await admin
        .from("staff_members")
        .select("role,active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (staffError || !staff?.active || staff.role !== "owner")
        return respond(403, "forbidden");

      let input: ReturnType<typeof invitationInput>;
      try {
        input = invitationInput(await readSmallJson(request));
      } catch {
        return respond(400, "invalid_request");
      }
      if (!input || input.email === user.email?.trim().toLowerCase())
        return respond(400, "invalid_request");

      const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(input.email, {
          redirectTo: config.redirectTo,
        });
      if (inviteError || !invited.user) {
        // Do not return Auth's account-existence or provider details to the browser.
        runtime.log({
          requestId,
          stage: "invite",
          code: inviteError?.code || "missing_user",
        });
        return respond(409, "invitation_not_completed");
      }
      // This service-role-only RPC rechecks the owner and atomically creates the
      // operator membership + audit event. Existing staff (including owners) are
      // rejected, never downgraded by an invitation.
      const { error: assignmentError } = await admin.rpc(
        "finish_staff_invite",
        {
          p_actor_id: user.id,
          p_invited_user_id: invited.user.id,
        },
      );
      if (assignmentError) {
        // An email may already have been delivered; report failure honestly. The
        // recipient has no new staff privileges if this atomic transaction fails.
        // Do not delete an Auth user here: it might be a pre-existing account.
        runtime.log({ requestId, stage: "assign", code: assignmentError.code });
        return respond(409, "invitation_not_completed");
      }
      return respond(200);
    } catch {
      runtime.log({ requestId, stage: "unexpected" });
      return respond(500, "invitation_not_completed");
    }
  };
}
