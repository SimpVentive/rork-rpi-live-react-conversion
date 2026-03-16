const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || "";
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE || "";
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN || "";

const DB_NAME = "rpi_live";

interface SurrealResponse<T = unknown> {
  result: T;
  status: string;
  time: string;
}

export async function dbQuery<T = unknown>(
  sql: string,
  vars?: Record<string, unknown>,
): Promise<T[]> {
  const url = `${DB_ENDPOINT}/sql`;
  const body = vars
    ? JSON.stringify({ query: sql, variables: vars })
    : sql;

  console.log("[DB] Executing query:", sql.substring(0, 200));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": vars ? "application/json" : "text/plain",
      Authorization: `Bearer ${DB_TOKEN}`,
      NS: DB_NAMESPACE,
      DB: DB_NAME,
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[DB] Query failed:", res.status, text);
    throw new Error(`DB query failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as SurrealResponse<T>[];
  console.log("[DB] Query returned", data.length, "result sets");

  const results: T[] = [];
  for (const entry of data) {
    if (entry.status === "OK" && entry.result !== null && entry.result !== undefined) {
      if (Array.isArray(entry.result)) {
        results.push(...(entry.result as T[]));
      } else {
        results.push(entry.result as T);
      }
    }
  }
  return results;
}

export async function dbQuerySingle<T = unknown>(
  sql: string,
): Promise<T | null> {
  const results = await dbQuery<T>(sql);
  return results.length > 0 ? results[0] : null;
}

export async function initDB(): Promise<void> {
  console.log("[DB] Initializing database tables...");

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS patient SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS name ON patient TYPE string;
    DEFINE FIELD IF NOT EXISTS age ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS g ON patient TYPE string;
    DEFINE FIELD IF NOT EXISTS sr ON patient TYPE string;
    DEFINE FIELD IF NOT EXISTS ar ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS gr ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS htn ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS dm ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS oa ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS osteo ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS injury ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS surgical ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS thyroid ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS flex ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS ext ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS lrot ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS rrot ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS start ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS fab_l ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS fair_l ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS slr_l ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS fab_r ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS fair_r ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS slr_r ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS hyp ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS tend ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS tight ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS knots ON patient TYPE int;
    DEFINE FIELD IF NOT EXISTS site ON patient TYPE string;
    DEFINE INDEX IF NOT EXISTS idx_patient_name ON patient FIELDS name UNIQUE;
    DEFINE INDEX IF NOT EXISTS idx_patient_site ON patient FIELDS site;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS scenario SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS ts ON scenario TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON scenario TYPE string;
    DEFINE FIELD IF NOT EXISTS weights ON scenario TYPE object;
    DEFINE FIELD IF NOT EXISTS sub_weights ON scenario TYPE object;
    DEFINE FIELD IF NOT EXISTS tga ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS tar ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS green ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS amber ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS red ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS total ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS sens ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS prec ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS acc ON scenario TYPE int;
    DEFINE FIELD IF NOT EXISTS patients ON scenario TYPE array;
    DEFINE INDEX IF NOT EXISTS idx_scenario_site ON scenario FIELDS site;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS patient_result SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS scenario_id ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS patient_name ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS age ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS gender ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS manual_risk ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS ar ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS gr ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS htn ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS dm ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS oa ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS osteo ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS injury ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS surgical ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS thyroid ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS flex ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS ext ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS lrot ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS rrot ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS start_raw ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS fab_l ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS fair_l ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS slr_l ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS fab_r ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS fair_r ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS slr_r ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS hyp ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS tend ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS tight ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS knots ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS smoke ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS smokeyrs ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS alcohol ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS alcoholyrs ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS sitting ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS standing ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_start ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_rom ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_physio ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_anthro ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_comor ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS score_life ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS rpi ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS tier ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS rpi_numeric ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS manual_numeric ON patient_result TYPE int;
    DEFINE FIELD IF NOT EXISTS ratio ON patient_result TYPE float;
    DEFINE FIELD IF NOT EXISTS ratio_distance ON patient_result TYPE float;
    DEFINE FIELD IF NOT EXISTS match_type ON patient_result TYPE string;
    DEFINE FIELD IF NOT EXISTS created_at ON patient_result TYPE string;
    DEFINE INDEX IF NOT EXISTS idx_pr_scenario ON patient_result FIELDS scenario_id;
    DEFINE INDEX IF NOT EXISTS idx_pr_patient ON patient_result FIELDS patient_name;
    DEFINE INDEX IF NOT EXISTS idx_pr_site ON patient_result FIELDS site;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS cohort_analysis SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS scenario_id ON cohort_analysis TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON cohort_analysis TYPE string;
    DEFINE FIELD IF NOT EXISTS ts ON cohort_analysis TYPE string;
    DEFINE FIELD IF NOT EXISTS total_patients ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS classified_patients ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS green_count ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS amber_count ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS red_count ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS sensitivity ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS precision_val ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS accuracy ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS concordant ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS partial ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS discordant ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS unclassified ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS avg_rpi_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS avg_rpi_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS avg_rpi_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS avg_ratio ON cohort_analysis TYPE float;
    DEFINE FIELD IF NOT EXISTS perfect_match_count ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_start_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_start_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_start_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_rom_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_rom_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_rom_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_physio_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_physio_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_physio_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_anthro_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_anthro_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_anthro_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_comor_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_comor_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_comor_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_life_high ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_life_mod ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS domain_avg_life_low ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS site_breakdown ON cohort_analysis TYPE array;
    DEFINE FIELD IF NOT EXISTS weights ON cohort_analysis TYPE object;
    DEFINE FIELD IF NOT EXISTS sub_weights ON cohort_analysis TYPE object;
    DEFINE FIELD IF NOT EXISTS tga ON cohort_analysis TYPE int;
    DEFINE FIELD IF NOT EXISTS tar ON cohort_analysis TYPE int;
    DEFINE INDEX IF NOT EXISTS idx_ca_scenario ON cohort_analysis FIELDS scenario_id;
    DEFINE INDEX IF NOT EXISTS idx_ca_site ON cohort_analysis FIELDS site;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS weight_config SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS name ON weight_config TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON weight_config TYPE string;
    DEFINE FIELD IF NOT EXISTS is_default ON weight_config TYPE bool;
    DEFINE FIELD IF NOT EXISTS weights ON weight_config TYPE object;
    DEFINE FIELD IF NOT EXISTS sub_weights ON weight_config TYPE object;
    DEFINE FIELD IF NOT EXISTS tga ON weight_config TYPE int;
    DEFINE FIELD IF NOT EXISTS tar ON weight_config TYPE int;
    DEFINE FIELD IF NOT EXISTS created_at ON weight_config TYPE string;
    DEFINE FIELD IF NOT EXISTS updated_at ON weight_config TYPE string;
    DEFINE INDEX IF NOT EXISTS idx_wc_name ON weight_config FIELDS name UNIQUE;
    DEFINE INDEX IF NOT EXISTS idx_wc_site ON weight_config FIELDS site;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS manual_override SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS patient_name ON manual_override TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON manual_override TYPE string;
    DEFINE FIELD IF NOT EXISTS risk ON manual_override TYPE string;
    DEFINE FIELD IF NOT EXISTS updated_at ON manual_override TYPE string;
    DEFINE INDEX IF NOT EXISTS idx_mo_patient ON manual_override FIELDS patient_name UNIQUE;
  `);

  await dbQuery(`
    DEFINE TABLE IF NOT EXISTS life_override SCHEMAFULL;
    DEFINE FIELD IF NOT EXISTS patient_name ON life_override TYPE string;
    DEFINE FIELD IF NOT EXISTS site ON life_override TYPE string;
    DEFINE FIELD IF NOT EXISTS smoke ON life_override TYPE int;
    DEFINE FIELD IF NOT EXISTS smokeyrs ON life_override TYPE string;
    DEFINE FIELD IF NOT EXISTS alcohol ON life_override TYPE int;
    DEFINE FIELD IF NOT EXISTS alcoholyrs ON life_override TYPE string;
    DEFINE FIELD IF NOT EXISTS sitting ON life_override TYPE int;
    DEFINE FIELD IF NOT EXISTS standing ON life_override TYPE int;
    DEFINE FIELD IF NOT EXISTS updated_at ON life_override TYPE string;
    DEFINE INDEX IF NOT EXISTS idx_lo_patient ON life_override FIELDS patient_name UNIQUE;
  `);

  console.log("[DB] Database tables initialized (patient, scenario, manual_override, life_override, patient_result, cohort_analysis, weight_config).");
}

let dbInitialized = false;

export async function ensureDB(): Promise<void> {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}
