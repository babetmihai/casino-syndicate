import globals from "globals";
import pluginReact from "eslint-plugin-react";


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "react/jsx-no-target-blank": "off",
      "semi": [
        "warn",
        "never"
      ],
      "no-multi-spaces": "warn",
      "padded-blocks": 0,
      "comma-dangle": [
        "warn",
        "never"
      ],
      "object-curly-spacing": [
        "warn",
        "always"
      ],
      "brace-style": "warn",
      "no-unused-vars": [
        "warn"
      ],
      "max-len": [
        "warn",
        120,
        4,
        {
          "ignoreComments": true
        }
      ],
      "space-infix-ops": "warn",
      "no-trailing-spaces": "warn",
      "indent": [
        "warn",
        2,
        {
          "SwitchCase": 1
        }
      ],
      "linebreak-style": [
        "warn",
        "unix"
      ],
      "quotes": [
        "warn",
        "double"
      ],
      "no-extra-semi": "off",
      "no-extra-boolean-cast": "warn",
      "no-console": "warn",
      "key-spacing": [
        "warn",
        {
          "beforeColon": false,
          "afterColon": true
        }
      ],
      "comma-spacing": [
        "warn",
        {
          "before": false,
          "after": true
        }
      ],
      "semi-spacing": [
        "warn",
        {
          "before": false,
          "after": true
        }
      ],
      "space-before-function-paren": [
        "warn",
        {
          "asyncArrow": "always",
          "named": "never",
          "anonymous": "never"
        }
      ],
      "space-before-blocks": [
        "warn"
      ],
      "no-multiple-empty-lines": [
        "warn",
        {
          "max": 2,
          "maxEOF": 1,
          "maxBOF": 1
        }
      ],
      "spaced-comment": [
        "warn",
        "always"
      ],
      "jsx-quotes": [
        "warn",
        "prefer-double"
      ],
      "react/jsx-uses-vars": [
        2
      ],
      "react/jsx-no-duplicate-props": "warn",
      "react/display-name": 0,
      "keyword-spacing": [
        "warn",
        {
          "before": true
        }
      ],
      "space-in-parens": [
        "warn",
        "never"
      ],
      "arrow-spacing": [
        "warn"
      ],
      "react/jsx-indent": [
        "warn",
        2,
        {
          "indentLogicalExpressions": true
        }
      ],
      "react/jsx-indent-props": [
        "warn",
        2
      ],
      "react/jsx-closing-bracket-location": "warn",
      "react/jsx-curly-spacing": [
        "warn",
        "never"
      ],
      "react/jsx-key": "warn",
      "react/jsx-tag-spacing": [
        "warn",
        {}
      ],
      "react/jsx-no-undef": "error",
      "no-undef": "error",
      "react/jsx-pascal-case": "warn",
      "react/jsx-wrap-multilines": "warn",
      "react/jsx-no-bind": 0,
      "react/jsx-equals-spacing": [
        "warn",
        "never"
      ],
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": "off"
    }
  }
];