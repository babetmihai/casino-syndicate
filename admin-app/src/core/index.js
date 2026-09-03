import { twMerge } from "tailwind-merge"
import clsx from "clsx"

export const EMPTY_OBJECT = {}
export const EMPTY_ARRAY = []

export const cn = (...inputs) => twMerge(clsx(inputs))

export const labelClass = cn("ui-label", "text-[0.75rem] tracking-[0.15em] uppercase text-cs-accent")
export const titleClass = cn("ui-title", "font-headings font-bold tracking-[-0.02em] leading-tight")
