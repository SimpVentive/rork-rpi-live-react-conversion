import { createTRPCRouter } from "./create-context";
import { patientsRouter } from "./routes/patients";
import { scenariosRouter } from "./routes/scenarios";
import { overridesRouter } from "./routes/overrides";
import { patientResultsRouter } from "./routes/patient-results";
import { cohortAnalysisRouter } from "./routes/cohort-analysis";
import { weightConfigsRouter } from "./routes/weight-configs";

export const appRouter = createTRPCRouter({
  patients: patientsRouter,
  scenarios: scenariosRouter,
  overrides: overridesRouter,
  patientResults: patientResultsRouter,
  cohortAnalysis: cohortAnalysisRouter,
  weightConfigs: weightConfigsRouter,
});

export type AppRouter = typeof appRouter;
