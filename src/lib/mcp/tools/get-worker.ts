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
  name: "get_worker",
  title: "Get employee",
  description: "Fetch a single employee by id, matricule, or CIN.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Employee UUID."),
    matricule: z.string().trim().optional().describe("Employee matricule."),
    cin: z.string().trim().optional().describe("Employee CIN (national ID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, matricule, cin }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!id && !matricule && !cin) {
      return {
        content: [{ type: "text", text: "Provide id, matricule, or cin." }],
        isError: true,
      };
    }
    let q = supabaseForUser(ctx).from("workers").select("*").limit(1);
    if (id) q = q.eq("id", id);
    else if (matricule) q = q.eq("matricule", matricule);
    else if (cin) q = q.eq("cin", cin);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { worker: data },
    };
  },
});
