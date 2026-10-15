# React + TypeScript + Vite

## Government bulk customer age analysis

The report needs `GET api/debtors/bulk/sectors` and
`GET api/debtors/bulk/government-age-analysis` from the updated MISReports API.
The sectors endpoint supplies sectors and the latest 24 available bulk bill cycles.

For local development, build `../MISReports_Api_new/MISReports_Api.sln` and
start that application in IIS Express at `http://localhost:44381`.
Set `VITE_LOCAL_API=http://localhost:44381` in `.env`, then run `npm run dev`.
Restart Vite after changing proxy settings. Requests to `/api/debtors` use
`VITE_LOCAL_API`; when it is unset, they use `VITE_SERVER_API` under `/misapi`.

For production, deploy the rebuilt MISReports API under `/misapi` on the
report server alongside the frontend. A frontend-only deployment leaves the
new report endpoints unavailable.

To check a running API, run `Tests/GovernmentAgeAnalysis.Smoke.ps1` from the
backend directory. Use `-BaseUri http://localhost:5173` to check through Vite.

The Area Type selector offers Province, Division, and Entire CEB. Province and
Division load their location choices from
`GET api/debtors/bulk/government-age-analysis/locations?areaType=Province` (or `Division`).
Reports accept `areaType` and `locationCode`; Entire CEB is the default and
needs no location code. Run `Tests/GovernmentAgeAnalysis.Scope.Smoke.ps1`
against the backend origin to verify geographic filtering and report totals.

Swagger uses the same Area Type choices and automatically loads the matching
province/division options into `locationCode`. Entire CEB disables that dropdown.
After rebuilding the backend, refresh Swagger with Ctrl+F5. To verify the
Swagger dropdowns and generated requests in headless Chrome, run
`node Tests/GovernmentAgeAnalysis.Swagger.Smoke.mjs` from the backend directory.
The check requires a running backend and Chrome; `SWAGGER_TEST_BROWSER` can
override the browser executable path.

The previous routes without `/bulk` remain available as compatibility aliases;
Swagger and the frontend use the bulk routes.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
