import { format, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d MMM yyyy", { locale: es })
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
