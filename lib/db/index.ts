import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Připojení k DB:
 *  - DATABASE_URL začínající postgres:// → Neon (produkce i lokální vývoj proti Neonu)
 *  - jinak PGlite (Postgres ve WASM, data ve složce .pglite) – lokální vývoj bez cloudu
 */
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle({ client: neon(url), schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DIR ?? "./.pglite";
  const client = new PGlite(dataDir);
  return drizzle({ client, schema }) as unknown as Db;
}

const globalForDb = globalThis as unknown as { __kvizovnaDb?: Promise<Db> };

/** Sdílená instance – v dev režimu přežije HMR díky globalThis. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__kvizovnaDb) globalForDb.__kvizovnaDb = createDb();
  return globalForDb.__kvizovnaDb;
}

export { schema };
