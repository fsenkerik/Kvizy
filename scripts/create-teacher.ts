import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { eq } from "drizzle-orm";
import { getDb, schema } from "../lib/db";
import { hashPassword } from "../lib/auth/password";

/**
 * Založí (nebo aktualizuje heslo) učitelského účtu.
 * Použití:
 *   npm run create-teacher -- --email ucitel@skola.cz --name "Jméno Příjmení" --password tajneheslo [--admin]
 */
function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const password = arg("password") ?? process.env.TEACHER_PASSWORD;
  const isAdmin = process.argv.includes("--admin");
  if (!email || !name || !password) {
    console.error('Použití: npm run create-teacher -- --email x@y.cz --name "Jméno" --password heslo [--admin]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Heslo musí mít alespoň 8 znaků.");
    process.exit(1);
  }

  const db = await getDb();
  const passwordHash = await hashPassword(password);
  const existing = await db.query.teachers.findFirst({ where: eq(schema.teachers.email, email) });
  if (existing) {
    await db.update(schema.teachers).set({ name, passwordHash, isAdmin: isAdmin || existing.isAdmin }).where(eq(schema.teachers.id, existing.id));
    console.log(`Účet ${email} aktualizován.`);
  } else {
    await db.insert(schema.teachers).values({ email, name, passwordHash, isAdmin });
    console.log(`Účet ${email} vytvořen${isAdmin ? " (admin)" : ""}.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
