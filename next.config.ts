import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (lokální vývojová DB) se nesmí bundlovat do serverless funkcí.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
