import { Pool } from "pg";

declare global {
  var __stepmaniaPool: Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

export function getPool() {
  if (!global.__stepmaniaPool) {
    global.__stepmaniaPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return global.__stepmaniaPool;
}

export async function checkDatabaseConnection() {
  const result = await getPool().query<{
    now: string;
    current_database: string;
    current_user: string;
  }>("select now()::text, current_database(), current_user");

  return result.rows[0];
}
