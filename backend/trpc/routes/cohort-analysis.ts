import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

const siteBreakdownSchema = z.object({
  site: z.string().nullable(),
  total: z.number().nullable(),
  green: z.number().nullable(),
  amber: z.number().nullable(),
  red: z.number().nullable(),
  classified: z.number().nullable(),
  sensitivity: z.number().nullable(),
});

export const cohortAnalysisRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM cohort_analysis ORDER BY ts DESC";
      const params: unknown[] = [];
      if (site && site !== "ALL") {
        sql = "SELECT * FROM cohort_analysis WHERE site = ? ORDER BY ts DESC";
        params.push(site);
      }
      console.log("[cohortAnalysis.list] Fetching cohort analyses");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[cohortAnalysis.list] Found", results.length, "analyses");
      return results;
    }),

  save: publicProcedure
    .input(z.object({
      accuracy: z.number().nullable(),
      amber_count: z.number().nullable(),
      avg_ratio: z.number().nullable(),
      avg_rpi_high: z.number().nullable(),
      avg_rpi_low: z.number().nullable(),
      avg_rpi_mod: z.number().nullable(),
      classified_patients: z.number().nullable(),
      concordant: z.number().nullable(),
      discordant: z.number().nullable(),
      domain_avg_anthro_high: z.number().nullable(),
      domain_avg_anthro_low: z.number().nullable(),
      domain_avg_anthro_mod: z.number().nullable(),
      domain_avg_comor_high: z.number().nullable(),
      domain_avg_comor_low: z.number().nullable(),
      domain_avg_comor_mod: z.number().nullable(),
      domain_avg_life_high: z.number().nullable(),
      domain_avg_life_low: z.number().nullable(),
      domain_avg_life_mod: z.number().nullable(),
      domain_avg_physio_high: z.number().nullable(),
      domain_avg_physio_low: z.number().nullable(),
      domain_avg_physio_mod: z.number().nullable(),
      domain_avg_rom_high: z.number().nullable(),
      domain_avg_rom_low: z.number().nullable(),
      domain_avg_rom_mod: z.number().nullable(),
      domain_avg_start_high: z.number().nullable(),
      domain_avg_start_low: z.number().nullable(),
      domain_avg_start_mod: z.number().nullable(),
      green_count: z.number().nullable(),
      partial: z.number().nullable(),
      perfect_match_count: z.number().nullable(),
      precision_val: z.number().nullable(),
      red_count: z.number().nullable(),
      scenario_id: z.string().nullable(),
      sensitivity: z.number().nullable(),
      site: z.string().nullable(),
      site_breakdown: z.array(siteBreakdownSchema),      
      sub_weights: z.object({
        anthro: z.object({
          age: z.number().nullable(),
          gen: z.number().nullable(),
        }).optional(),
        comor:z.object({
          htn: z.number().nullable(),
          dm: z.number().nullable(),
          inj: z.number().nullable(),
          oa: z.number().nullable(),
          osteo: z.number().nullable(),
          surg: z.number().nullable(),
          thyr: z.number().nullable(),
        }).optional(),
        life: z.object({
          alcohol: z.number().nullable(),
          lifeinj: z.number().nullable(),
          lifesurg: z.number().nullable(),
          sitting: z.number().nullable(),
          smoke: z.number().nullable(),
          standing: z.number().nullable(),
        }).optional(),
        physio: z.object({
          fabl: z.number().nullable(),
          fabr: z.number().nullable(),
          fairl: z.number().nullable(),
          fairr: z.number().nullable(),
          hyp: z.number().nullable(),
          knots: z.number().nullable(),
          slrl: z.number().nullable(),
          slrr: z.number().nullable(),
          tend: z.number().nullable(),
          tight: z.number().nullable(),
        }).optional(),
        rom: z.object({
          ext: z.number().nullable(),
          flex: z.number().nullable(),
          lrot: z.number().nullable(),
          rrot: z.number().nullable(),
        }).optional(),
        start: z.object({
          s1: z.number().nullable(),
          s2: z.number().nullable(),
          s3: z.number().nullable(),
          s4: z.number().nullable(),
          s5: z.number().nullable(),
          s6: z.number().nullable(),
          s7: z.number().nullable(),
          s8: z.number().nullable(),
          s9: z.number().nullable(),
        }).optional(),
      }).optional(),
      tar: z.number().nullable(),
      tga: z.number().nullable(),
      total_patients: z.number().nullable(),
      ts: z.string().nullable(),
      unclassified: z.number().nullable(),
      weights: z.object({
        anthro: z.number().nullable(),
        comor: z.number().nullable(),
        life: z.number().nullable(),
        physio: z.number().nullable(),
        rom: z.number().nullable(),
        start: z.number().nullable(),
      }),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[cohortAnalysis.save] Saving cohort analysis for scenario:", input.scenario_id);

      const siteBreakdownJson = JSON.stringify(input.site_breakdown);
      const weightsJson = JSON.stringify(input.weights);
      const subWeightsJson = JSON.stringify(input.sub_weights);

      await dbQuery(
        `INSERT INTO cohort_analysis (scenario_id, site,  total_patients, classified_patients, green_count, amber_count, red_count, sensitivity, precision_val, accuracy, concordant, partial, discordant, unclassified, avg_rpi_high, avg_rpi_mod, avg_rpi_low, avg_ratio, perfect_match_count, domain_avg_start_high, domain_avg_start_mod, domain_avg_start_low, domain_avg_rom_high, domain_avg_rom_mod, domain_avg_rom_low, domain_avg_physio_high, domain_avg_physio_mod, domain_avg_physio_low, domain_avg_anthro_high, domain_avg_anthro_mod, domain_avg_anthro_low, domain_avg_comor_high, domain_avg_comor_mod, domain_avg_comor_low, domain_avg_life_high, domain_avg_life_mod, domain_avg_life_low, site_breakdown, weights, sub_weights, tga, tar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.scenario_id,
          input.site,
          input.total_patients,
          input.classified_patients,
          input.green_count,
          input.amber_count,
          input.red_count,
          input.sensitivity,
          input.precision_val,
          input.accuracy,
          input.concordant,
          input.partial,
          input.discordant,
          input.unclassified,
          input.avg_rpi_high,
          input.avg_rpi_mod,
          input.avg_rpi_low,
          input.avg_ratio,
          input.perfect_match_count,
          input.domain_avg_start_high,
          input.domain_avg_start_mod,
          input.domain_avg_start_low,
          input.domain_avg_rom_high,
          input.domain_avg_rom_mod,
          input.domain_avg_rom_low,
          input.domain_avg_physio_high,
          input.domain_avg_physio_mod,
          input.domain_avg_physio_low,
          input.domain_avg_anthro_high,
          input.domain_avg_anthro_mod,
          input.domain_avg_anthro_low,
          input.domain_avg_comor_high,
          input.domain_avg_comor_mod,
          input.domain_avg_comor_low,
          input.domain_avg_life_high,
          input.domain_avg_life_mod,
          input.domain_avg_life_low,
          siteBreakdownJson,
          weightsJson,
          subWeightsJson,
          input.tga,
          input.tar,
        ],
      );

      console.log("[cohortAnalysis.save] Cohort analysis saved successfully");
      return { success: true };
    }),

  deleteByScenario: publicProcedure
    .input(z.object({ scenario_id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[cohortAnalysis.deleteByScenario] Deleting for scenario:", input.scenario_id);
      await dbQuery("DELETE FROM cohort_analysis WHERE scenario_id = ?", [input.scenario_id]);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        await dbQuery("DELETE FROM cohort_analysis WHERE site = ?", [site]);
      } else {
        await dbQuery("DELETE FROM cohort_analysis");
      }
      return { success: true };
    }),
});
