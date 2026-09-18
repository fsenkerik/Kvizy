import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { getDb } from "../lib/db";

/**
 * Aplikuje migrace ze složky ./drizzle na DATABASE_URL (Neon) nebo lokální PGlite.
 * Spouští se: npm run db:migrate
 */
async function main() {
  const db = await getDb();
  const url = process.env.DATABASE_URL;
  const isPg = !!url && /^postgres(ql)?:\/\//.test(url);
  if (isPg) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
    console.log("Migrace aplikovány na Neon.");
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
    console.log(`Migrace aplikovány na lokální PGlite (${process.env.PGLITE_DIR ?? "./.pglite"}).`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
