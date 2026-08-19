export const CHIP_VALUES = [1, 5, 25, 100]
export const MAX_NUMBER_BET = 100

export const CHIP_COLORS = {
  1: {
    fill: "var(--mantine-color-gray-0)",
    stroke: "var(--mantine-color-gray-5)",
    text: "var(--mantine-color-dark-6)"
  },
  5: {
    fill: "var(--mantine-color-red-6)",
    stroke: "var(--mantine-color-red-8)",
    text: "var(--mantine-color-white)"
  },
  25: {
    fill: "var(--mantine-color-teal-6)",
    stroke: "var(--mantine-color-teal-8)",
    text: "var(--mantine-color-white)"
  },
  100: {
    fill: "var(--mantine-color-dark-6)",
    stroke: "var(--mantine-color-dark-9)",
    text: "var(--mantine-color-white)"
  }
}

export const toChips = (amount) => {
  const chips = []
  let remaining = amount
  for (const value of [...CHIP_VALUES].reverse()) {
    while (remaining >= value) {
      chips.push(value)
      remaining -= value
    }
  }
  return chips
}
