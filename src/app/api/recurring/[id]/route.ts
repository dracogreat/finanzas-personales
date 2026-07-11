import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id } = params
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    }

    const { description, amount, type, categoryId, frequency, nextDate, active } = await request.json()

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(type && { type }),
        ...(categoryId && { categoryId }),
        ...(frequency && { frequency }),
        ...(nextDate && { nextDate: new Date(nextDate + "T12:00:00") }),
        ...(active !== undefined && { active }),
      },
      include: { category: true },
    })

    return NextResponse.json(recurring)
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id } = params
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    }

    await prisma.recurringTransaction.delete({ where: { id } })

    return NextResponse.json({ message: "Eliminada" })
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}
