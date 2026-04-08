import mysql from "mysql2/promise";
import type { Pool, RowDataPacket } from "mysql2/promise";
import "dotenv/config";

// ENV CONFIG
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "rpi_live";

// SINGLETON POOL
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log(
      `[DB] Pool created → ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`
    );
  }
  return pool;
}

// GENERIC QUERY
export async function query<T = any>(
  sql: string,
  values?: any[]
): Promise<T[]> {
  const conn = getPool();

  console.log("[DB] USING QUERY METHOD");
  
  const [rows] = await conn.query(sql, values); // ✅ FIXED

  return rows as T[];
}

// SINGLE ROW
export async function querySingle<T = RowDataPacket>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows[0] || null;
}

// INIT DATABASE
export async function initDB(): Promise<void> {
  console.log("[DB] Initializing tables...");

  await query(`
    CREATE TABLE IF NOT EXISTS patient (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      age INT,
      g VARCHAR(50),
      sr VARCHAR(50),
      ar INT,
      gr INT,
      htn BOOLEAN,
      dm BOOLEAN,
      oa BOOLEAN,
      osteo BOOLEAN,
      injury BOOLEAN,
      surgical BOOLEAN,
      thyroid BOOLEAN,
      flex INT,
      ext INT,
      lrot INT,
      rrot INT,
      start INT,
      fab_l INT,
      fair_l INT,
      slr_l INT,
      fab_r INT,
      fair_r INT,
      slr_r INT,
      hyp INT,
      tend INT,
      tight INT,
      knots INT,
      site VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patient_site (site)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS scenario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      site VARCHAR(255),
      weights JSON,
      sub_weights JSON,
      tga INT,
      tar INT,
      green INT,
      amber INT,
      red INT,
      total INT,
      sens INT,
      prec INT,
      acc INT,
      patients JSON,
      INDEX idx_scenario_site (site)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patient_result (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scenario_id INT,
      patient_name VARCHAR(255),
      site VARCHAR(255),
      age INT,
      gender VARCHAR(50),
      manual_risk VARCHAR(50),
      ar INT,
      gr INT,
      htn BOOLEAN,
      dm BOOLEAN,
      oa BOOLEAN,
      osteo BOOLEAN,
      injury BOOLEAN,
      surgical BOOLEAN,
      thyroid BOOLEAN,
      flex INT,
      ext INT,
      lrot INT,
      rrot INT,
      start_raw INT,
      fab_l INT,
      fair_l INT,
      slr_l INT,
      fab_r INT,
      fair_r INT,
      slr_r INT,
      hyp INT,
      tend INT,
      tight INT,
      knots INT,
      smoke BOOLEAN,
      smokeyrs VARCHAR(255),
      alcohol BOOLEAN,
      alcoholyrs VARCHAR(255),
      sitting INT,
      standing INT,
      score_start INT,
      score_rom INT,
      score_physio INT,
      score_anthro INT,
      score_comor INT,
      score_life INT,
      rpi INT,
      tier VARCHAR(50),
      rpi_numeric INT,
      manual_numeric INT,
      ratio FLOAT,
      ratio_distance FLOAT,
      match_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pr_scenario (scenario_id),
      INDEX idx_pr_patient (patient_name),
      INDEX idx_pr_site (site)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cohort_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scenario_id INT,
      site VARCHAR(255),
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_patients INT,
      classified_patients INT,
      green_count INT,
      amber_count INT,
      red_count INT,
      sensitivity INT,
      precision_val INT,
      accuracy INT,
      concordant INT,
      partial INT,
      discordant INT,
      unclassified INT,
      avg_rpi_high INT,
      avg_rpi_mod INT,
      avg_rpi_low INT,
      avg_ratio FLOAT,
      perfect_match_count INT,
      domain_avg_start_high INT,
      domain_avg_start_mod INT,
      domain_avg_start_low INT,
      domain_avg_rom_high INT,
      domain_avg_rom_mod INT,
      domain_avg_rom_low INT,
      domain_avg_physio_high INT,
      domain_avg_physio_mod INT,
      domain_avg_physio_low INT,
      domain_avg_anthro_high INT,
      domain_avg_anthro_mod INT,
      domain_avg_anthro_low INT,
      domain_avg_comor_high INT,
      domain_avg_comor_mod INT,
      domain_avg_comor_low INT,
      domain_avg_life_high INT,
      domain_avg_life_mod INT,
      domain_avg_life_low INT,
      site_breakdown JSON,
      weights JSON,
      sub_weights JSON,
      tga INT,
      tar INT,
      INDEX idx_ca_scenario (scenario_id),
      INDEX idx_ca_site (site)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS weight_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      site VARCHAR(255),
      is_default BOOLEAN,
      weights JSON,
      sub_weights JSON,
      tga INT,
      tar INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wc_site (site)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS manual_override (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL UNIQUE,
      site VARCHAR(255),
      risk VARCHAR(50),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS life_override (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_name VARCHAR(255) NOT NULL UNIQUE,
      site VARCHAR(255),
      smoke BOOLEAN,
      smokeyrs VARCHAR(255),
      alcohol BOOLEAN,
      alcoholyrs VARCHAR(255),
      sitting INT,
      standing INT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("[DB] All tables initialized successfully ✅");
}

// ENSURE INIT ONCE
let dbInitialized = false;

export async function ensureDB(): Promise<void> {
  if (!dbInitialized) {
    try {
      await initDB();
      dbInitialized = true;
    } catch (err) {
      console.error("[DB] Init failed:", err);
      throw err;
    }
  }
}

// OPTIONAL: HEALTH CHECK
export async function checkDB(): Promise<void> {
  try {
    await query("SELECT 1");
    console.log("[DB] Connection OK ✅");
  } catch (err) {
    console.error("[DB] Connection FAILED ❌", err);
  }
}

// EXPORT ALIASES
export const dbQuery = query;
export const dbQuerySingle = querySingle;