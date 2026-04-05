import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

const patientResultSchema = z.object({
  scenario_id: z.string(),
  patient_name: z.string(),
  site: z.string(),
  age: z.number(),
  gender: z.string(),
  manual_risk: z.string(),
  ar: z.number(),
  gr: z.number(),
  htn: z.number(),
  dm: z.number(),
  oa: z.number(),
  osteo: z.number(),
  injury: z.number(),
  surgical: z.number(),
  thyroid: z.number(),
  flex: z.number(),
  ext: z.number(),
  lrot: z.number(),
  rrot: z.number(),
  start_raw: z.number(),
  fab_l: z.number(),
  fair_l: z.number(),
  slr_l: z.number(),
  fab_r: z.number(),
  fair_r: z.number(),
  slr_r: z.number(),
  hyp: z.number(),
  tend: z.number(),
  tight: z.number(),
  knots: z.number(),
  smoke: z.number(),
  smokeyrs: z.string(),
  alcohol: z.number(),
  alcoholyrs: z.string(),
  sitting: z.number(),
  standing: z.number(),
  score_start: z.number(),
  score_rom: z.number(),
  score_physio: z.number(),
  score_anthro: z.number(),
  score_comor: z.number(),
  score_life: z.number(),
  rpi: z.number(),
  tier: z.string(),
  rpi_numeric: z.number(),
  manual_numeric: z.number(),
  ratio: z.number(),
  ratio_distance: z.number(),
  match_type: z.string(),
});

export const patientResultsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      scenario_id: z.string().optional(),
      site: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const scenarioId = input?.scenario_id;
      const site = input?.site;

      let sql = "SELECT * FROM patient_result ORDER BY patient_name ASC";
      const params: unknown[] = [];
      if (scenarioId) {
        sql = "SELECT * FROM patient_result WHERE scenario_id = ? ORDER BY patient_name ASC";
        params.push(scenarioId);
      } else if (site && site !== "ALL") {
        sql = "SELECT * FROM patient_result WHERE site = ? ORDER BY patient_name ASC";
        params.push(site);
      }

      console.log("[patientResults.list] Fetching patient results");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[patientResults.list] Found", results.length, "patient results");
      return results;
    }),

  saveBatch: publicProcedure
    .input(z.object({
      results: z.array(patientResultSchema),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[patientResults.saveBatch] Saving", input.results.length, "patient results");

      for (const r of input.results) {
        await dbQuery(
          `INSERT INTO patient_result (scenario_id, patient_name, site, age, gender, manual_risk, ar, gr, htn, dm, oa, osteo, injury, surgical, thyroid, flex, ext, lrot, rrot, start_raw, fab_l, fair_l, slr_l, fab_r, fair_r, slr_r, hyp, tend, tight, knots, smoke, smokeyrs, alcohol, alcoholyrs, sitting, standing, score_start, score_rom, score_physio, score_anthro, score_comor, score_life, rpi, tier, rpi_numeric, manual_numeric, ratio, ratio_distance, match_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.scenario_id,
            r.patient_name,
            r.site,
            r.age,
            r.gender,
            r.manual_risk,
            r.ar,
            r.gr,
            r.htn,
            r.dm,
            r.oa,
            r.osteo,
            r.injury,
            r.surgical,
            r.thyroid,
            r.flex,
            r.ext,
            r.lrot,
            r.rrot,
            r.start_raw,
            r.fab_l,
            r.fair_l,
            r.slr_l,
            r.fab_r,
            r.fair_r,
            r.slr_r,
            r.hyp,
            r.tend,
            r.tight,
            r.knots,
            r.smoke,
            r.smokeyrs,
            r.alcohol,
            r.alcoholyrs,
            r.sitting,
            r.standing,
            r.score_start,
            r.score_rom,
            r.score_physio,
            r.score_anthro,
            r.score_comor,
            r.score_life,
            r.rpi,
            r.tier,
            r.rpi_numeric,
            r.manual_numeric,
            r.ratio,
            r.ratio_distance,
            r.match_type,
            new Date().toISOString(),
          ],
        );
      }

      console.log("[patientResults.saveBatch] Saved", input.results.length, "patient results");
      return { success: true, count: input.results.length };
    }),

  deleteByScenario: publicProcedure
    .input(z.object({ scenario_id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[patientResults.deleteByScenario] Deleting results for scenario:", input.scenario_id);
      await dbQuery("DELETE FROM patient_result WHERE scenario_id = ?", [input.scenario_id]);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        console.log("[patientResults.clearAll] Clearing patient results for site:", site);
        await dbQuery("DELETE FROM patient_result WHERE site = ?", [site]);
      } else {
        console.log("[patientResults.clearAll] Clearing all patient results");
        await dbQuery("DELETE FROM patient_result");
      }
      return { success: true };
    }),
});
