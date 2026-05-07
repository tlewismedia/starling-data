import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    exclude: [...configDefaults.exclude, ".claude/**", "tests/e2e/**"],
  },
});
