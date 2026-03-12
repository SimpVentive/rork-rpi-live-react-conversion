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
      if (site && site !== "ALL") {
        sql = `SELECT * FROM patient WHERE site = '${site}' ORDER BY name ASC`;
      }
      console.log("[patients.list] Fetching patients, site:", site || "ALL");
      const results = await dbQuery<Record<string, unknown>>(sql);
      console.log("[patients.list] Found", results.length, "patients");
      return results;
    }),

  seed: publicProcedure
    .input(z.object({ patients: z.array(patientSchema) }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[patients.seed] Seeding", input.patients.length, "patients");

      const existing = await dbQuery<Record<string, unknown>>("SELECT count() FROM patient GROUP ALL");
      const count = existing.length > 0 ? (existing[0] as { count: number }).count : 0;

      if (count > 0) {
        console.log("[patients.seed] DB already has", count, "patients, skipping seed");
        return { seeded: false, existing: count };
      }

      for (const p of input.patients) {
        const escapedName = p.name.replace(/'/g, "\\'");
        await dbQuery(`
          CREATE patient SET
            name = '${escapedName}',
            age = ${p.age},
            g = '${p.g}',
            sr = '${p.sr}',
            ar = ${p.ar},
            gr = ${p.gr},
            htn = ${p.htn},
            dm = ${p.dm},
            oa = ${p.oa},
            osteo = ${p.osteo},
            injury = ${p.injury},
            surgical = ${p.surgical},
            thyroid = ${p.thyroid},
            flex = ${p.flex},
            ext = ${p.ext},
            lrot = ${p.lrot},
            rrot = ${p.rrot},
            start = ${p.start},
            fab_l = ${p.fab_l},
            fair_l = ${p.fair_l},
            slr_l = ${p.slr_l},
            fab_r = ${p.fab_r},
            fair_r = ${p.fair_r},
            slr_r = ${p.slr_r},
            hyp = ${p.hyp},
            tend = ${p.tend},
            tight = ${p.tight},
            knots = ${p.knots},
            site = '${p.site}'
        `);
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
      const escapedName = input.name.replace(/'/g, "\\'");
      const sets = Object.entries(input.fields)
        .map(([k, v]) => {
          if (typeof v === "string") return `${k} = '${v.replace(/'/g, "\\'")}'`;
          return `${k} = ${v}`;
        })
        .join(", ");

      console.log("[patients.update] Updating patient:", input.name, "fields:", sets);
      await dbQuery(`UPDATE patient SET ${sets} WHERE name = '${escapedName}'`);
      return { success: true };
    }),
});
