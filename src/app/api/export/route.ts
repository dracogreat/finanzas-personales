import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const year = searchParams.get("year")
  const date = searchParams.get("date")

  const where: Record<string, unknown> = { userId: session.user.id }

  if (date) {
    const d = new Date(date + "T12:00:00")
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    where.date = { gte: start, lt: end }
  } else if (month && year) {
    const m = parseInt(month)
    const y = parseInt(year)
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  })

  const headers = ["Fecha", "Tipo", "Categoría", "Descripción", "Cantidad", "P. Unitario", "Total", "Observaciones"]
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("es-PE"),
    t.type === "entrada" ? "Entrada" : t.type === "salida" ? "Salida" : t.type === "saving" ? "Ahorro" : t.type === "retiro_ahorro" ? "Retiro ahorro" : t.type === "deuda" ? "Deuda" : t.type === "pago_deuda" ? "Pago de deuda" : t.type,
    t.category.name,
    t.description,
    t.quantity ? String(t.quantity) : "",
    t.quantity ? (t.amount / t.quantity).toFixed(2) : "",
    t.amount.toFixed(2),
    t.notes || "",
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n")

  const filename = month && year
    ? `transacciones-${year}-${month.padStart ? month.padStart(2, "0") : month}.csv`
    : "transacciones.csv"

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
