import { defineConfig } from "vitest/config";

// The pure core/ is the unit-tested surface (ADR-0001). Adapters that import
// `obsidian` are excluded from the unit suite and exercised manually.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/core/**/*.test.ts"],
  },
});
