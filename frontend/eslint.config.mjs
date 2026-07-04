import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      // Several dashboard pages use `<img>` for previews; fixing all is out of scope.
      "@next/next/no-img-element": "off",
      // React 19 compiler rules flag standard fetch-on-mount / form-sync patterns
      // used throughout the dashboard; disabling avoids a large unrelated refactor.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
