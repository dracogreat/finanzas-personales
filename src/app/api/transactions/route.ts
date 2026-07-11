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
  const type = searchParams.get("type")
  const categoryId = searchParams.get("categoryId")

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

  if (type) where.type = type
  if (categoryId) where.categoryId = categoryId

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(transactions)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { amount, quantity, notes, description, date, type, categoryId } = await request.json()

    if (!amount || !description || !date || !type || !categoryId) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        ...(quantity && { quantity: parseFloat(quantity) }),
        ...(notes && { notes }),
        description,
        date: new Date(date + "T12:00:00"),
        type,
        categoryId,
        userId: session.user.id,
      },
      include: { category: true },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear transacción" },
      { status: 500 }
    )
  }
}
