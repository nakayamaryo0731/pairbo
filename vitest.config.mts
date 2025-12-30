import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 10000,
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
