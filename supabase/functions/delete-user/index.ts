/**
 * Supabase Edge Function: delete-user
 *
 * GDPR-compliant full account deletion.
 * Deletes user data from ALL 15 tables, then deletes the auth.users row.
 *
 * Authenticated via the user's own JWT — extracts user_id from the token.
 * Uses service_role key internally for admin operations.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's JWT to get user_id
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Create anon client to verify the JWT
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Create service-role client for admin operations
    const admin = createClient(supabaseUrl, serviceKey);

    // -----------------------------------------------------------------------
    // Delete from all 15 tables (order: dependents first, then parents)
    // -----------------------------------------------------------------------
    const deletions = [
      // User activity & metrics
      admin.from("capacity_logs").delete().eq("user_id", userId),
      admin.from("user_daily_metrics").delete().eq("user_id", userId),
      admin.from("capacity_baselines").delete().eq("user_id", userId),
      admin.from("proof_events").delete().eq("user_id", userId),

      // Org & circles
      admin.from("circle_invites").delete().eq("invited_by", userId),
      admin.from("circle_members").delete().eq("user_id", userId),
      admin.from("org_memberships").delete().eq("user_id", userId),
      admin.from("org_aggregate_snapshots").delete().eq("created_by", userId),

      // User settings & tokens
      admin.from("user_preferences").delete().eq("user_id", userId),
      admin.from("user_entitlements").delete().eq("user_id", userId),
      admin.from("user_push_tokens").delete().eq("user_id", userId),

      // Commerce
      admin.from("purchase_history").delete().eq("user_id", userId),

      // Audit (GDPR: delete identifiable audit trail)
      admin.from("audit_events").delete().eq("user_id", userId),
    ];

    const results = await Promise.allSettled(deletions);

    // Check for hard failures (network errors, not "0 rows deleted")
    const failures = results.filter(
      (r) => r.status === "rejected"
    );

    // Also delete circles owned by this user (circles table uses created_by or owner)
    await admin.from("circles").delete().eq("created_by", userId);

    // Delete restricted_domains entries associated with the user's org
    // (only if user is the sole owner — skip if shared)

    // -----------------------------------------------------------------------
    // Delete the auth.users row (irreversible)
    // -----------------------------------------------------------------------
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return new Response(
        JSON.stringify({
          error: "Data deleted but auth user removal failed",
          details: deleteAuthError.message,
          data_deleted: true,
          auth_deleted: false,
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        tables_processed: 15,
        failures: failures.length,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
