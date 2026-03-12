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

  console.log("[DB] Database tables initialized.");
}

let dbInitialized = false;

export async function ensureDB(): Promise<void> {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}
