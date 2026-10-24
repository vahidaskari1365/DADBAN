import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  // skills/ = اسکیل‌های عامل (کد شخص ثالث برای AI، نه سورس سایت) — tmp/ و shots/ هم آرتیفکت
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "skills/**", "tmp/**", "shots/**"]),
]);
