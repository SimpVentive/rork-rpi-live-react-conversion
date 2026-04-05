import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

const patientSchema = z.object({
  name: z.string(),
  age: z.number(),
  g: z.string(),
  sr: z.string(),
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
  start: z.number(),
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
  site: z.string(),
});

export const patientsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM patient ORDER BY name ASC";
      const params: unknown[] = [];
      if (site && site !== "ALL") {
        sql = "SELECT * FROM patient WHERE site = ? ORDER BY name ASC";
        params.push(site);
      }
      console.log("[patients.list] Fetching patients, site:", site || "ALL");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[patients.list] Found", results.length, "patients");
      return results;
    }),

  seed: publicProcedure
    .input(z.object({ patients: z.array(patientSchema) }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[patients.seed] Seeding", input.patients.length, "patients");

      const existing = await dbQuery<{ COUNT: number }>("SELECT COUNT(*) as COUNT FROM patient");
      const count = existing.length > 0 ? existing[0].COUNT : 0;

      if (count > 0) {
        console.log("[patients.seed] DB already has", count, "patients, skipping seed");
        return { seeded: false, existing: count };
      }

      for (const p of input.patients) {
        await dbQuery(
          `INSERT INTO patient (name, age, g, sr, ar, gr, htn, dm, oa, osteo, injury, surgical, thyroid, flex, ext, lrot, rrot, start, fab_l, fair_l, slr_l, fab_r, fair_r, slr_r, hyp, tend, tight, knots, site)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.name,
            p.age,
            p.g,
            p.sr,
            p.ar,
            p.gr,
            p.htn,
            p.dm,
            p.oa,
            p.osteo,
            p.injury,
            p.surgical,
            p.thyroid,
            p.flex,
            p.ext,
            p.lrot,
            p.rrot,
            p.start,
            p.fab_l,
            p.fair_l,
            p.slr_l,
            p.fab_r,
            p.fair_r,
            p.slr_r,
            p.hyp,
            p.tend,
            p.tight,
            p.knots,
            p.site,
          ],
        );
      }

      console.log("[patients.seed] Seeded", input.patients.length, "patients successfully");
      return { seeded: true, count: input.patients.length };
    }),

  update: publicProcedure
    .input(z.object({
      name: z.string(),
      fields: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      const entries = Object.entries(input.fields);
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), input.name];

      console.log("[patients.update] Updating patient:", input.name, "fields:", Object.keys(input.fields));
      await dbQuery(`UPDATE patient SET ${setClause} WHERE name = ?`, values);
      return { success: true };
    }),
});
