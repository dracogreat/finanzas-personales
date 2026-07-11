import { startOfMonth, endOfMonth } from "date-fns"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatCurrencyISO(amount: number, currency: string): string {
  const locales: Record<string, string> = { PEN: "es-PE", USD: "en-US", EUR: "es-ES", GBP: "en-GB", JPY: "ja-JP" }
  return new Intl.NumberFormat(locales[currency] || "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export const RATES: Record<string, number> = { PEN: 1, USD: 0.27, EUR: 0.25, GBP: 0.21, JPY: 40.5 }

export function convertCurrency(amount: number, from: string, to: string): number {
  const inPEN = amount / (RATES[from] || 1)
  return inPEN * (RATES[to] || 1)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${day}/${m}/${y}`
}

export function getMonthRange(date: Date = new Date()) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return { start, end }
}

export function getCurrentMonth() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}
