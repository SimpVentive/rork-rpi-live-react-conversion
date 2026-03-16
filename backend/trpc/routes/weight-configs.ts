import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

export const weightConfigsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM weight_config ORDER BY created_at DESC";
      if (site && site !== "ALL") {
        sql = `SELECT * FROM weight_config WHERE site = '${site}' ORDER BY created_at DESC`;
      }
      console.log("[weightConfigs.list] Fetching weight configs");
      const results = await dbQuery<Record<string, unknown>>(sql);
      console.log("[weightConfigs.list] Found", results.length, "configs");
      return results;
    }),

  save: publicProcedure
    .input(z.object({
      name: z.string(),
      site: z.string(),
      is_default: z.boolean(),
      weights: z.record(z.number()),
      sub_weights: z.record(z.unknown()),
      tga: z.number(),
      tar: z.number(),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      const escapedName = input.name.replace(/'/g, "\\'");
      console.log("[weightConfigs.save] Saving weight config:", input.name);

      await dbQuery(`DELETE weight_config WHERE name = '${escapedName}'`);

      if (input.is_default) {
        await dbQuery(`UPDATE weight_config SET is_default = false WHERE site = '${input.site}'`);
      }

      const weightsJson = JSON.stringify(input.weights);
      const subWeightsJson = JSON.stringify(input.sub_weights);
      const now = new Date().toISOString();

      await dbQuery(`
        CREATE weight_config SET
          name = '${escapedName}',
          site = '${input.site}',
          is_default = ${input.is_default},
          weights = ${weightsJson},
          sub_weights = ${subWeightsJson},
          tga = ${input.tga},
          tar = ${input.tar},
          created_at = '${now}',
          updated_at = '${now}'
      `);

      console.log("[weightConfigs.save] Weight config saved successfully");
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      const escapedName = input.name.replace(/'/g, "\\'");
      console.log("[weightConfigs.delete] Deleting weight config:", input.name);
      await dbQuery(`DELETE weight_config WHERE name = '${escapedName}'`);
      return { success: true };
    }),
});
