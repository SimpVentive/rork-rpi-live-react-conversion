import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

export const overridesRouter = createTRPCRouter({
  listManual: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM manual_override";
      const params: unknown[] = [];
      if (site && site !== "ALL") {
        sql = "SELECT * FROM manual_override WHERE site = ?";
        params.push(site);
      }
      console.log("[overrides.listManual] Fetching manual overrides");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[overrides.listManual] Found", results.length, "overrides");

      const map: Record<string, string> = {};
      for (const r of results) {
        map[r.patient_name as string] = r.risk as string;
      }
      return map;
    }),

  setManual: publicProcedure
    .input(z.object({
      patient_name: z.string(),
      site: z.string(),
      risk: z.string(),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[overrides.setManual] Setting manual override:", input.patient_name, "->", input.risk);

      await dbQuery("DELETE FROM manual_override WHERE patient_name = ?", [input.patient_name]);
      await dbQuery(
        "INSERT INTO manual_override (patient_name, site, risk, updated_at) VALUES (?, ?, ?, ?)",
        [input.patient_name, input.site, input.risk, new Date().toISOString()],
      );
      return { success: true };
    }),

  listLife: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM life_override";
      const params: unknown[] = [];
      if (site && site !== "ALL") {
        sql = "SELECT * FROM life_override WHERE site = ?";
        params.push(site);
      }
      console.log("[overrides.listLife] Fetching life overrides");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[overrides.listLife] Found", results.length, "life overrides");

      const map: Record<string, Record<string, unknown>> = {};
      for (const r of results) {
        const name = r.patient_name as string;
        map[name] = {
          smoke: r.smoke ?? 0,
          smokeyrs: r.smokeyrs ?? "0",
          alcohol: r.alcohol ?? 0,
          alcoholyrs: r.alcoholyrs ?? "0",
          sitting: r.sitting ?? 0,
          standing: r.standing ?? 0,
        };
      }
      return map;
    }),

  setLife: publicProcedure
    .input(z.object({
      patient_name: z.string(),
      site: z.string(),
      smoke: z.number(),
      smokeyrs: z.string(),
      alcohol: z.number(),
      alcoholyrs: z.string(),
      sitting: z.number(),
      standing: z.number(),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[overrides.setLife] Setting life override for:", input.patient_name);

      await dbQuery("DELETE FROM life_override WHERE patient_name = ?", [input.patient_name]);
      await dbQuery(
        `INSERT INTO life_override (patient_name, site, smoke, smokeyrs, alcohol, alcoholyrs, sitting, standing, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.patient_name,
          input.site,
          input.smoke,
          input.smokeyrs,
          input.alcohol,
          input.alcoholyrs,
          input.sitting,
          input.standing,
          new Date().toISOString(),
        ],
      );
      return { success: true };
    }),
});
