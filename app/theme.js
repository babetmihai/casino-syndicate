import { createTheme } from "@mantine/core"

const teal = [
  "#e6fffa",
  "#ccfbf1",
  "#99f6e4",
  "#5eead4",
  "#2dd4bf",
  "#14b8a6",
  "#0d9488",
  "#0f766e",
  "#115e59",
  "#134e4a"
]

const dark = [
  "#eef2f6",
  "#c5ced8",
  "#93a0b0",
  "#5c6b7a",
  "#2a3542",
  "#1c2530",
  "#161d26",
  "#111820",
  "#0d1218",
  "#0a0e14"
]

export const theme = createTheme({
  primaryColor: "teal",
  primaryShade: { light: 4, dark: 4 },
  autoContrast: true,
  defaultRadius: "md",
  fontFamily: "JetBrains Mono, ui-monospace, monospace",
  fontFamilyMonospace: "JetBrains Mono, ui-monospace, monospace",
  headings: {
    fontFamily: "Syne, sans-serif",
    fontWeight: "700"
  },
  cursorType: "pointer",
  colors: {
    teal,
    dark
  },
  components: {
    Button: {
      defaultProps: {
        size: "sm"
      },
      styles: {
        root: {
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase"
        }
      }
    },
    ActionIcon: {
      defaultProps: {
        variant: "subtle",
        color: "gray"
      }
    },
    Modal: {
      defaultProps: {
        centered: true,
        radius: "md"
      },
      styles: {
        header: {
          background: "var(--color-cs-elevated)"
        },
        content: {
          background: "var(--color-cs-elevated)",
          border: "1px solid var(--color-cs-border)"
        }
      }
    },
    Card: {
      defaultProps: {
        shadow: "none",
        radius: "md",
        padding: "md",
        withBorder: true
      }
    }
  }
})
