import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Tables exposed via the external API. Anything not in this list is rejected.
const ALLOWED_TABLES = new Set([
  "workers",
  "documents",
  "absences",
  "conges",
  "acompte_transactions",
]);

const ALLOWED_ACTIONS = new Set(["select", "insert", "update", "delete"]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- 1. Validate the static API key ---
    const auth = req.headers.get("Authorization") ?? "";
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!apiKey) return json({ error: "Missing Authorization Bearer token" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const keyHash = await sha256Hex(apiKey);
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("id, active, revoked_at, scopes")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyErr) return json({ error: "Key lookup failed" }, 500);
    if (!keyRow || !keyRow.active || keyRow.revoked_at) {
      return json({ error: "Invalid or revoked API key" }, 401);
    }

    // fire-and-forget last_used update
    admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

    // --- 2. Parse the request ---
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { table, action, data, filters, select, limit, order } = body ?? {};

    if (typeof table !== "string" || !ALLOWED_TABLES.has(table)) {
      return json({ error: `Table not allowed. Allowed: ${[...ALLOWED_TABLES].join(", ")}` }, 403);
    }
    if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      return json({ error: `Action not allowed. Allowed: ${[...ALLOWED_ACTIONS].join(", ")}` }, 403);
    }

    // scope check (empty scopes = full access on allowed tables)
    if (keyRow.scopes && keyRow.scopes.length > 0 && !keyRow.scopes.includes(table)) {
      return json({ error: `This API key is not authorized for table "${table}"` }, 403);
    }

    // --- 3. Execute the query ---
    let q: any = admin.from(table);

    if (action === "select") {
      q = q.select(select ?? "*");
      if (filters && typeof filters === "object") {
        for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
      }
      if (order && typeof order === "object" && (order as any).column) {
        q = q.order((order as any).column, { ascending: (order as any).ascending !== false });
      }
      if (typeof limit === "number") q = q.limit(limit);
    } else if (action === "insert") {
      if (!data) return json({ error: "`data` is required for insert" }, 400);
      q = q.insert(data).select();
    } else if (action === "update") {
      if (!data) return json({ error: "`data` is required for update" }, 400);
      if (!filters || typeof filters !== "object" || Object.keys(filters).length === 0) {
        return json({ error: "`filters` is required for update (safety)" }, 400);
      }
      q = q.update(data);
      for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
      q = q.select();
    } else if (action === "delete") {
      if (!filters || typeof filters !== "object" || Object.keys(filters).length === 0) {
        return json({ error: "`filters` is required for delete (safety)" }, 400);
      }
      q = q.delete();
      for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
      q = q.select();
    }

    const { data: result, error } = await q;
    if (error) return json({ error: error.message, details: error }, 400);

    return json({ data: result });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
