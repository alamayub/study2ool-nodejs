import pkg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pkg;

// postgres://<USER>:<PASSWORD>@<HOST>:5432/<DATABASE>
const connectionString = 'postgresql://study2ool_user:6cO2TOA243BFHXroUMkXpDBCFr4Uspu7@dpg-d3h63g9r0fns73c4f3p0-a.oregon-postgres.render.com/study2ool';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }, // Render requires SSL
});

// --- Initialize DB ---
async function initDB() {
  try {
    const sqlPath = path.resolve("db/schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    await pool.query(sql);
    console.log("✅ PostgreSQL schema initialized");
  } catch (error) {
    console.error("ERROR WHILE CONNECTING TO DB ", error);
  }
}

export { pool, initDB };
