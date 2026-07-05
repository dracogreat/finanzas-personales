import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      )
    }

    const { amount, description, date, type, categoryId } = await request.json()

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(type && { type }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
    })

    return NextResponse.json(transaction)
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar transacción" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      )
    }

    await prisma.transaction.delete({ where: { id: params.id } })

    return NextResponse.json({ message: "Transacción eliminada" })
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar transacción" },
      { status: 500 }
    )
  }
}
