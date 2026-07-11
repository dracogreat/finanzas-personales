import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: session.user.id },
    include: { category: true },
    orderBy: { nextDate: "asc" },
  })

  return NextResponse.json(recurring)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { description, amount, type, categoryId, frequency, nextDate } = await request.json()

    if (!description || !amount || !type || !categoryId || !frequency || !nextDate) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        type,
        categoryId,
        frequency,
        nextDate: new Date(nextDate + "T12:00:00"),
        userId: session.user.id,
      },
      include: { category: true },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear transacción recurrente" },
      { status: 500 }
    )
  }
}
