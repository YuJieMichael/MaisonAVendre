import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: { preserveSymlinks: true },
  test: { include: ["tests/**/*.test.{ts,tsx}"] },
});
