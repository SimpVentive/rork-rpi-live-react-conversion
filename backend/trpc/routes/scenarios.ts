import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { dbQuery, ensureDB } from "../../db";

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value as T; // already parsed
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      let sql = "SELECT * FROM scenario ORDER BY ts DESC";
      const params: unknown[] = [];
      if (site && site !== "ALL") {
        sql = "SELECT * FROM scenario WHERE site = ? ORDER BY ts DESC";
        params.push(site);
      }
      console.log("[scenarios.list] Fetching scenarios, site:", site || "ALL");
      const results = await dbQuery<Record<string, unknown>>(sql, params);
      console.log("[scenarios.list] Found", results.length, "scenarios");
      return results.map((row) => {
        const d = new Date(row.ts as string);

        const formattedTs = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${
          d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          }).toLowerCase()
        }`;

        return {
          ...row,
          ts: formattedTs,
          weights: parseJsonField<Record<string, number>>(row.weights, {}),
          sub_weights: parseJsonField<Record<string, unknown>>(row.sub_weights, {}),
          patients: parseJsonField<Array<Record<string, unknown>>>(row.patients, []),
        };
      });
    }),

  save: publicProcedure
    .input(z.object({
      scenario_id: z.string().optional(),
      site: z.string(),
      ts: z.string(),
      weights: z.object({
        anthro: z.number(),
        comor: z.number(),
        life: z.number(),
        physio: z.number(),
        rom: z.number(),
        start: z.number(),
      }),
      sub_weights: z.object({
        anthro: z.object({
          age: z.number(),
          gen: z.number(),
        }).optional(),
        comor:z.object({
          htn: z.number(),
          dm: z.number(),
          inj: z.number(),
          oa: z.number(),
          osteo: z.number(),
          surg: z.number(),
          thyr: z.number(),
        }).optional(),
        life: z.object({
          alcohol: z.number(),
          lifeinj: z.number(),
          lifesurg: z.number(),
          sitting: z.number(),
          smoke: z.number(),
          standing: z.number(),
        }).optional(),
        physio: z.object({
          fabl: z.number(),
          fabr: z.number(),
          fairl: z.number(),
          fairr: z.number(),
          hyp: z.number(),
          knots: z.number(),
          slrl: z.number(),
          slrr: z.number(),
          tend: z.number(),
          tight: z.number(),
        }).optional(),
        rom: z.object({
          ext: z.number(),
          flex: z.number(),
          lrot: z.number(),
          rrot: z.number(),
        }).optional(),
        start: z.object({
          s1: z.number(),
          s2: z.number(),
          s3: z.number(),
          s4: z.number(),
          s5: z.number(),
          s6: z.number(),
          s7: z.number(),
          s8: z.number(),
          s9: z.number(),
        }).optional(),
      }).optional(),
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
        age: z.number().optional(),
        gender: z.enum(["M", "F"]).optional(),
        rpi: z.number(),
        tier: z.string(),
        manualRisk: z.string(),
        domainScores: z.object({
          anthro: z.number(),
          comor: z.number(),
          life: z.number(),
          physio: z.number(),
          rom: z.number(),
          start: z.number(),
        }).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[scenarios.save] Saving scenario for site:", input.site);

      const weightsJson = JSON.stringify(input.weights);
      const subWeightsJson = JSON.stringify(input.sub_weights);
      const patientsJson = JSON.stringify(input.patients);

      await dbQuery(
        `INSERT INTO scenario (scenario_id, acc, amber, green, patients, prec, red, sens, site, sub_weights, tar, tga, total, weights)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.scenario_id,
          input.acc,
          input.amber,
          input.green,
          patientsJson,
          input.prec,
          input.red,
          input.sens,
          input.site,
          subWeightsJson,
          input.tar,
          input.tga,
          input.total,
          weightsJson,
        ],
      );

      console.log("[scenarios.save] Scenario saved successfully");
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDB();
      console.log("[scenarios.delete] Deleting scenario:", input.id);
      await dbQuery("DELETE FROM scenario WHERE id = ?", [input.id]);
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ site: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await ensureDB();
      const site = input?.site;
      if (site && site !== "ALL") {
        console.log("[scenarios.clearAll] Clearing scenarios for site:", site);
        await dbQuery("DELETE FROM scenario WHERE site = ?", [site]);
      } else {
        console.log("[scenarios.clearAll] Clearing all scenarios");
        await dbQuery("DELETE FROM scenario");
      }
      return { success: true };
    }),
});
