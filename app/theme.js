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
        variant: "subtle",
        color: "gray"
      }
    },
    Modal: {
      defaultProps: {
        centered: true,
        radius: "md"
      }
    },
    Card: {
      defaultProps: {
        shadow: "xs",
        radius: "md",
        padding: "md"
      }
    }
  }
})
