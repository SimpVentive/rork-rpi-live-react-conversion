import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

const siteBreakdownSchema = z.object({
  site: z.string(),
  total: z.number(),
  green: z.number(),
  amber: z.number(),
  red: z.number(),
  classified: z.number(),
  sensitivity: z.number().nullable(),
});

export const cohortAnalysisRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM cohort_analysis ORDER BY ts DESC";
      if (site && site !== "ALL") {
        sql = `SELECT * FROM cohort_analysis WHERE site = '${site}' ORDER BY ts DESC`;
      }
      console.log("[cohortAnalysis.list] Fetching cohort analyses");
      const results = await dbQuery<Record<string, unknown>>(sql);
      console.log("[cohortAnalysis.list] Found", results.length, "analyses");
      return results;
    }),

  save: publicProcedure
    .input(z.object({
      scenario_id: z.string(),
      site: z.string(),
      ts: z.string(),
      total_patients: z.number(),
      classified_patients: z.number(),
      green_count: z.number(),
      amber_count: z.number(),
      red_count: z.number(),
      sensitivity: z.number(),
      precision_val: z.number(),
      accuracy: z.number(),
      concordant: z.number(),
      partial: z.number(),
      discordant: z.number(),
      unclassified: z.number(),
      avg_rpi_high: z.number(),
      avg_rpi_mod: z.number(),
      avg_rpi_low: z.number(),
      avg_ratio: z.number(),
      perfect_match_count: z.number(),
      domain_avg_start_high: z.number(),
      domain_avg_start_mod: z.number(),
      domain_avg_start_low: z.number(),
      domain_avg_rom_high: z.number(),
      domain_avg_rom_mod: z.number(),
      domain_avg_rom_low: z.number(),
      domain_avg_physio_high: z.number(),
      domain_avg_physio_mod: z.number(),
      domain_avg_physio_low: z.number(),
      domain_avg_anthro_high: z.number(),
      domain_avg_anthro_mod: z.number(),
      domain_avg_anthro_low: z.number(),
      domain_avg_comor_high: z.number(),
      domain_avg_comor_mod: z.number(),
      domain_avg_comor_low: z.number(),
      domain_avg_life_high: z.number(),
      domain_avg_life_mod: z.number(),
      domain_avg_life_low: z.number(),
      site_breakdown: z.array(siteBreakdownSchema),
      weights: z.record(z.number()),
      sub_weights: z.record(z.unknown()),
      tga: z.number(),
      tar: z.number(),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[cohortAnalysis.save] Saving cohort analysis for scenario:", input.scenario_id);

      const siteBreakdownJson = JSON.stringify(input.site_breakdown);
      const weightsJson = JSON.stringify(input.weights);
      const subWeightsJson = JSON.stringify(input.sub_weights);

      await dbQuery(`
        CREATE cohort_analysis SET
          scenario_id = '${input.scenario_id}',
          site = '${input.site}',
          ts = '${input.ts}',
          total_patients = ${input.total_patients},
          classified_patients = ${input.classified_patients},
          green_count = ${input.green_count},
          amber_count = ${input.amber_count},
          red_count = ${input.red_count},
          sensitivity = ${input.sensitivity},
          precision_val = ${input.precision_val},
          accuracy = ${input.accuracy},
          concordant = ${input.concordant},
          partial = ${input.partial},
          discordant = ${input.discordant},
          unclassified = ${input.unclassified},
          avg_rpi_high = ${input.avg_rpi_high},
          avg_rpi_mod = ${input.avg_rpi_mod},
          avg_rpi_low = ${input.avg_rpi_low},
          avg_ratio = ${input.avg_ratio},
          perfect_match_count = ${input.perfect_match_count},
          domain_avg_start_high = ${input.domain_avg_start_high},
          domain_avg_start_mod = ${input.domain_avg_start_mod},
          domain_avg_start_low = ${input.domain_avg_start_low},
          domain_avg_rom_high = ${input.domain_avg_rom_high},
          domain_avg_rom_mod = ${input.domain_avg_rom_mod},
          domain_avg_rom_low = ${input.domain_avg_rom_low},
          domain_avg_physio_high = ${input.domain_avg_physio_high},
          domain_avg_physio_mod = ${input.domain_avg_physio_mod},
          domain_avg_physio_low = ${input.domain_avg_physio_low},
          domain_avg_anthro_high = ${input.domain_avg_anthro_high},
          domain_avg_anthro_mod = ${input.domain_avg_anthro_mod},
          domain_avg_anthro_low = ${input.domain_avg_anthro_low},
          domain_avg_comor_high = ${input.domain_avg_comor_high},
          domain_avg_comor_mod = ${input.domain_avg_comor_mod},
          domain_avg_comor_low = ${input.domain_avg_comor_low},
          domain_avg_life_high = ${input.domain_avg_life_high},
          domain_avg_life_mod = ${input.domain_avg_life_mod},
          domain_avg_life_low = ${input.domain_avg_life_low},
          site_breakdown = ${siteBreakdownJson},
          weights = ${weightsJson},
          sub_weights = ${subWeightsJson},
          tga = ${input.tga},
          tar = ${input.tar}
      `);

      console.log("[cohortAnalysis.save] Cohort analysis saved successfully");
      return { success: true };
    }),

  deleteByScenario: publicProcedure
    .input(z.object({ scenario_id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[cohortAnalysis.deleteByScenario] Deleting for scenario:", input.scenario_id);
      await dbQuery(`DELETE cohort_analysis WHERE scenario_id = '${input.scenario_id}'`);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        await dbQuery(`DELETE cohort_analysis WHERE site = '${site}'`);
      } else {
        await dbQuery("DELETE cohort_analysis");
      }
      return { success: true };
    }),
});
