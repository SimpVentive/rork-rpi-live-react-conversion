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
      if (scenarioId) {
        sql = `SELECT * FROM patient_result WHERE scenario_id = '${scenarioId}' ORDER BY patient_name ASC`;
      } else if (site && site !== "ALL") {
        sql = `SELECT * FROM patient_result WHERE site = '${site}' ORDER BY patient_name ASC`;
      }

      console.log("[patientResults.list] Fetching patient results");
      const results = await dbQuery<Record<string, unknown>>(sql);
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
        const escapedName = r.patient_name.replace(/'/g, "\\'");
        await dbQuery(`
          CREATE patient_result SET
            scenario_id = '${r.scenario_id}',
            patient_name = '${escapedName}',
            site = '${r.site}',
            age = ${r.age},
            gender = '${r.gender}',
            manual_risk = '${r.manual_risk}',
            ar = ${r.ar},
            gr = ${r.gr},
            htn = ${r.htn},
            dm = ${r.dm},
            oa = ${r.oa},
            osteo = ${r.osteo},
            injury = ${r.injury},
            surgical = ${r.surgical},
            thyroid = ${r.thyroid},
            flex = ${r.flex},
            ext = ${r.ext},
            lrot = ${r.lrot},
            rrot = ${r.rrot},
            start_raw = ${r.start_raw},
            fab_l = ${r.fab_l},
            fair_l = ${r.fair_l},
            slr_l = ${r.slr_l},
            fab_r = ${r.fab_r},
            fair_r = ${r.fair_r},
            slr_r = ${r.slr_r},
            hyp = ${r.hyp},
            tend = ${r.tend},
            tight = ${r.tight},
            knots = ${r.knots},
            smoke = ${r.smoke},
            smokeyrs = '${r.smokeyrs}',
            alcohol = ${r.alcohol},
            alcoholyrs = '${r.alcoholyrs}',
            sitting = ${r.sitting},
            standing = ${r.standing},
            score_start = ${r.score_start},
            score_rom = ${r.score_rom},
            score_physio = ${r.score_physio},
            score_anthro = ${r.score_anthro},
            score_comor = ${r.score_comor},
            score_life = ${r.score_life},
            rpi = ${r.rpi},
            tier = '${r.tier}',
            rpi_numeric = ${r.rpi_numeric},
            manual_numeric = ${r.manual_numeric},
            ratio = ${r.ratio},
            ratio_distance = ${r.ratio_distance},
            match_type = '${r.match_type}',
            created_at = '${new Date().toISOString()}'
        `);
      }

      console.log("[patientResults.saveBatch] Saved", input.results.length, "patient results");
      return { success: true, count: input.results.length };
    }),

  deleteByScenario: publicProcedure
    .input(z.object({ scenario_id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[patientResults.deleteByScenario] Deleting results for scenario:", input.scenario_id);
      await dbQuery(`DELETE patient_result WHERE scenario_id = '${input.scenario_id}'`);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        console.log("[patientResults.clearAll] Clearing patient results for site:", site);
        await dbQuery(`DELETE patient_result WHERE site = '${site}'`);
      } else {
        console.log("[patientResults.clearAll] Clearing all patient results");
        await dbQuery("DELETE patient_result");
      }
      return { success: true };
    }),
});
