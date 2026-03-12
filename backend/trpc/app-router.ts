import { createTRPCRouter } from "./create-context";
import { patientsRouter } from "./routes/patients";
import { scenariosRouter } from "./routes/scenarios";
import { overridesRouter } from "./routes/overrides";

export const appRouter = createTRPCRouter({
  patients: patientsRouter,
  scenarios: scenariosRouter,
  overrides: overridesRouter,
});

export type AppRouter = typeof appRouter;
