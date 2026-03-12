import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM scenario ORDER BY ts DESC";
      if (site && site !== "ALL") {
        sql = `SELECT * FROM scenario WHERE site = '${site}' ORDER BY ts DESC`;
      }
      console.log("[scenarios.list] Fetching scenarios, site:", site || "ALL");
      const results = await dbQuery<Record<string, unknown>>(sql);
      console.log("[scenarios.list] Found", results.length, "scenarios");
      return results;
    }),

  save: publicProcedure
    .input(z.object({
      site: z.string(),
      ts: z.string(),
      weights: z.record(z.number()),
      sub_weights: z.record(z.unknown()),
      tga: z.number(),
      tar: z.number(),
      green: z.number(),
      amber: z.number(),
      red: z.number(),
      total: z.number(),
      sens: z.number(),
      prec: z.number(),
      acc: z.number(),
      patients: z.array(z.object({
        name: z.string(),
        rpi: z.number(),
        tier: z.string(),
        manualRisk: z.string(),
        domainScores: z.record(z.number()),
      })),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[scenarios.save] Saving scenario for site:", input.site);

      const weightsJson = JSON.stringify(input.weights);
      const subWeightsJson = JSON.stringify(input.sub_weights);
      const patientsJson = JSON.stringify(input.patients);

      const results = await dbQuery<Record<string, unknown>>(`
        CREATE scenario SET
          site = '${input.site}',
          ts = '${input.ts}',
          weights = ${weightsJson},
          sub_weights = ${subWeightsJson},
          tga = ${input.tga},
          tar = ${input.tar},
          green = ${input.green},
          amber = ${input.amber},
          red = ${input.red},
          total = ${input.total},
          sens = ${input.sens},
          prec = ${input.prec},
          acc = ${input.acc},
          patients = ${patientsJson}
      `);

      console.log("[scenarios.save] Scenario saved successfully");
      return results.length > 0 ? results[0] : { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[scenarios.delete] Deleting scenario:", input.id);
      await dbQuery(`DELETE ${input.id}`);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        console.log("[scenarios.clearAll] Clearing scenarios for site:", site);
        await dbQuery(`DELETE scenario WHERE site = '${site}'`);
      } else {
        console.log("[scenarios.clearAll] Clearing all scenarios");
        await dbQuery("DELETE scenario");
      }
      return { success: true };
    }),
});
