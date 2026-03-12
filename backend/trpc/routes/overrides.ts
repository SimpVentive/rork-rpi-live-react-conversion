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
      if (site && site !== "ALL") {
        sql = `SELECT * FROM manual_override WHERE site = '${site}'`;
      }
      console.log("[overrides.listManual] Fetching manual overrides");
      const results = await dbQuery<Record<string, unknown>>(sql);
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
      const escapedName = input.patient_name.replace(/'/g, "\\'");
      console.log("[overrides.setManual] Setting manual override:", input.patient_name, "->", input.risk);

      await dbQuery(`DELETE manual_override WHERE patient_name = '${escapedName}'`);
      await dbQuery(`
        CREATE manual_override SET
          patient_name = '${escapedName}',
          site = '${input.site}',
          risk = '${input.risk}',
          updated_at = '${new Date().toISOString()}'
      `);
      return { success: true };
    }),

  listLife: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM life_override";
      if (site && site !== "ALL") {
        sql = `SELECT * FROM life_override WHERE site = '${site}'`;
      }
      console.log("[overrides.listLife] Fetching life overrides");
      const results = await dbQuery<Record<string, unknown>>(sql);
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
      const escapedName = input.patient_name.replace(/'/g, "\\'");
      console.log("[overrides.setLife] Setting life override for:", input.patient_name);

      await dbQuery(`DELETE life_override WHERE patient_name = '${escapedName}'`);
      await dbQuery(`
        CREATE life_override SET
          patient_name = '${escapedName}',
          site = '${input.site}',
          smoke = ${input.smoke},
          smokeyrs = '${input.smokeyrs}',
          alcohol = ${input.alcohol},
          alcoholyrs = '${input.alcoholyrs}',
          sitting = ${input.sitting},
          standing = ${input.standing},
          updated_at = '${new Date().toISOString()}'
      `);
      return { success: true };
    }),
});
