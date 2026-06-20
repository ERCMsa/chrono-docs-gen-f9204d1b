import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Tables exposed via the external API. Anything not in this list is rejected.
const ALLOWED_TABLES = new Set([
  "workers",
  "documents",
  "absences",
  "conges",
  "acompte_transactions",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const url = new URL(req.url);

    // Accept GET (?table=workers&limit=50) or POST { table, filters, limit, order, select }
    let params: Record<string, any> = {};
    if (req.method === "GET") {
      params = Object.fromEntries(url.searchParams.entries());
      if (params.limit) params.limit = Number(params.limit);
    } else if (req.method === "POST") {
      try {
        params = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
    } else {
      return json({ error: "Use GET or POST" }, 405);
    }

    const { table, filters, select, limit, order } = params;

    if (typeof table !== "string" || !ALLOWED_TABLES.has(table)) {
      return json({ error: `Table not allowed. Allowed: ${[...ALLOWED_TABLES].join(", ")}` }, 403);
    }

    let q: any = admin.from(table).select(select ?? "*");

    if (filters && typeof filters === "object") {
      for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    } else if (req.method === "GET") {
      // any extra query params (besides reserved ones) become equality filters
      for (const [k, v] of url.searchParams.entries()) {
        if (!["table", "select", "limit", "order"].includes(k)) q = q.eq(k, v);
      }
    }

    if (order && typeof order === "object" && (order as any).column) {
      q = q.order((order as any).column, { ascending: (order as any).ascending !== false });
    }
    if (typeof limit === "number") q = q.limit(limit);

    const { data: result, error } = await q;
    if (error) return json({ error: error.message }, 400);

    return json({ data: result });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
