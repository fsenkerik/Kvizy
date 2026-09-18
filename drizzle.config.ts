import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
const usePg = !!url && /^postgres(ql)?:\/\//.test(url);

export default defineConfig(
  usePg
    ? {
        dialect: "postgresql",
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: url! },
      }
    : {
        dialect: "postgresql",
        driver: "pglite",
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" },
      },
);
