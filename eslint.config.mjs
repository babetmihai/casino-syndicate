import globals from "globals"
import pluginReact from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

const reactJsxRuntimeRules = pluginReact.configs.flat["jsx-runtime"].rules
const reactHooksRecommended = reactHooks.configs["recommended-latest"]

export default [
  { ignores: ["**/dist/**", "**/artifacts/**", "**/cache/**", "**/contracts/**", "**/vite.config.mjs", "eslint.config.mjs"] },
  {
    files: ["admin-app/**/*.{js,mjs,jsx}", "client-app/**/*.{js,mjs,jsx}", "blockchain/scripts/**/*.js", "blockchain/test/**/*.js", "blockchain/hardhat.config.js"],
    plugins: {
      ...pluginReact.configs.flat.recommended.plugins,
      ...reactHooksRecommended.plugins
    },
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...reactJsxRuntimeRules,
      ...reactHooksRecommended.rules,
      "react/display-name": "off",
      quotes: ["warn", "double"],
      semi: ["warn", "never"],
      indent: [
        "warn",
        2,
        {
          SwitchCase: 1
        }
      ],
      "react-hooks/exhaustive-deps": "off",
      "react/jsx-indent": [
        "warn",
        2,
        {
          indentLogicalExpressions: true
        }
      ],
      "comma-dangle": ["warn", "never"],
      "no-multi-spaces": "warn",
      "padded-blocks": "off",
      "object-curly-spacing": [
        "warn",
        "always"
      ],
      "brace-style": "warn",
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^React$"
        }
      ],
      "max-len": [
        "warn",
        160,
        4,
        {
          ignoreComments: true
        }
      ],
      "react/jsx-max-props-per-line": [
        "warn",
        {
          maximum: { single: 3, multi: 1 }
        }
      ],
      "react/jsx-first-prop-new-line": [
        "warn",
        "multiline-multiprop"
      ],
      "space-infix-ops": "warn",
      "no-trailing-spaces": "warn",
      "linebreak-style": [
        "warn",
        "unix"
      ],
      "no-fallthrough": "warn",
      "no-unneeded-ternary": "warn",
      "no-extra-semi": "off",
      "no-extra-boolean-cast": "warn",
      "no-console": "warn",
      "key-spacing": [
        "warn",
        {
          beforeColon: false,
          afterColon: true
        }
      ],
      "comma-spacing": [
        "warn",
        {
          before: false,
          after: true
        }
      ],
      "semi-spacing": [
        "warn",
        {
          before: false,
          after: true
        }
      ],
      "space-before-function-paren": [
        "warn",
        {
          asyncArrow: "always",
          named: "never",
          anonymous: "never"
        }
      ],
      "space-before-blocks": [
        "warn"
      ],
      "no-multiple-empty-lines": [
        "warn",
        {
          max: 2,
          maxEOF: 1,
          maxBOF: 1
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
      "keyword-spacing": [
        "warn",
        {
          before: true
        }
      ],
      "space-in-parens": [
        "warn",
        "never"
      ],
      "arrow-spacing": [
        "warn"
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
      "react/jsx-pascal-case": "warn",
      "react/jsx-wrap-multilines": "warn",
      "react/jsx-no-bind": 0,
      "react/jsx-equals-spacing": [
        "warn",
        "never"
      ],
      "react/prop-types": "off"
    }
  },
  {
    files: ["blockchain/scripts/**/*.js", "blockchain/hardhat.config.js", "blockchain/test/**/*.js"],
    rules: {
      "no-console": "off"
    }
  }
]
