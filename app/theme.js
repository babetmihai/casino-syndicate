import { createTheme } from "@mantine/core"

export const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily: "Roboto, Helvetica, Arial, sans-serif",
  headings: {
    fontFamily: "Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "500"
  },
  components: {
    Button: {
      defaultProps: {
        size: "sm"
      }
    },
    ActionIcon: {
      defaultProps: {
        variant: "subtle"
      }
    },
    Modal: {
      defaultProps: {
        centered: true,
        radius: "md"
      },
      styles: {
        header: {
          background: "var(--mantine-color-gray-2)"
        }
      }
    },
    Card: {
      defaultProps: {
        shadow: "xs",
        radius: "md",
        padding: "sm"
      }
    }
  }
})
