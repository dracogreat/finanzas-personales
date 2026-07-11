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

  const where: Record<string, unknown> = { userId: session.user.id }
  if (month) where.month = parseInt(month)
  if (year) where.year = parseInt(year)

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const m = budget.month
      const y = budget.year
      const spent = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId: session.user.id,
          categoryId: budget.categoryId,
          type: "salida",
          date: {
            gte: new Date(y, m - 1, 1),
            lt: new Date(y, m, 1),
          },
        },
      })

      return {
        ...budget,
        spent: spent._sum.amount || 0,
        remaining: budget.amount - (spent._sum.amount || 0),
      }
    })
  )

  return NextResponse.json(budgetsWithSpent)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { amount, month, year, categoryId } = await request.json()

    if (!amount || !month || !year || !categoryId) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    const existing = await prisma.budget.findUnique({
      where: {
        userId_categoryId_month_year: {
          userId: session.user.id,
          categoryId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    })

    if (existing) {
      const budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: parseFloat(amount) },
        include: { category: true },
      })
      return NextResponse.json(budget)
    }

    const budget = await prisma.budget.create({
      data: {
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
        categoryId,
        userId: session.user.id,
      },
      include: { category: true },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear presupuesto" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "ID requerido" },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!budget) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado" },
        { status: 404 }
      )
    }

    await prisma.budget.delete({ where: { id } })

    return NextResponse.json({ message: "Presupuesto eliminado" })
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar presupuesto" },
      { status: 500 }
    )
  }
}
