import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// `public/` holds the AI Studio reference prototype — a separate Vite app kept for
// design reference only. It is never built or imported, so linting it just reports
// other people's problems. tsconfig.json excludes it for the same reason.
const eslintConfig = [
  ...nextCoreWebVitals,
  { ignores: [".next/**", "node_modules/**", "public/**"] },
];

export default eslintConfig;
