import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_workers",
  title: "List employees",
  description:
    "List employees (workers) visible to the signed-in user. Respects the app's role and department permissions.",
  inputSchema: {
    search: z
      .string()
      .trim()
      .optional()
      .describe("Optional substring to match against full name, matricule, or CIN."),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Max number of rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("workers")
      .select("id, full_name, matricule, cin, position, department, phone, is_active")
      .limit(limit ?? 50);
    if (search && search.length > 0) {
      const like = `%${search}%`;
      q = q.or(`full_name.ilike.${like},matricule.ilike.${like},cin.ilike.${like}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { workers: data ?? [] },
    };
  },
});
