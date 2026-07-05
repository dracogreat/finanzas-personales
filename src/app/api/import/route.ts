import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { transactions } = await request.json()

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "No hay transacciones para importar" }, { status: 400 })
    }

    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
    })

    let imported = 0
    let errors = 0

    for (const row of transactions) {
      try {
        const type = (row.tipo || row.type || "").toLowerCase().includes("ingreso") ? "income" : "expense"

        const catName = row.categoria || row.category || ""
        let category = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase() && c.type === type)

        if (!category) {
          category = categories.find((c) => c.type === type)
        }

        if (!category) continue

        const amount = parseFloat(row.total || row.monto || row.amount || row.precio_total || "0")
        if (!amount || amount <= 0) { errors++; continue }

        const date = row.fecha || row.date || new Date().toISOString().split("T")[0]
        const description = row.descripcion || row.description || row.nombre || row.name || "Importado"

        await prisma.transaction.create({
          data: {
            amount,
            quantity: row.cantidad || row.quantity || row.unidades ? parseFloat(row.cantidad || row.quantity || row.unidades) : null,
            notes: row.observacion || row.observaciones || row.notes || null,
            description,
            date: new Date(date),
            type,
            categoryId: category.id,
            userId: session.user.id,
          },
        })
        imported++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      message: `Importación completada: ${imported} transacciones importadas, ${errors} errores`,
      imported,
      errors,
    })
  } catch {
    return NextResponse.json({ error: "Error al importar" }, { status: 500 })
  }
}
