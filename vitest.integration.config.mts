import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

const fromFile = config({ path: ".env.test" }).parsed ?? {};

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    fileParallelism: false,
    env: fromFile,
  },
});
