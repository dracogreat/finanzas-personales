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
    const existing = await prisma.category.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    const { name, color, icon, type } = await request.json()

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(type && { type }),
      },
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 })
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
    const existing = await prisma.category.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { _count: { select: { transactions: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    if (existing._count.transactions > 0) {
      return NextResponse.json(
        { error: "No puedes eliminar una categoría con transacciones asociadas" },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id: params.id } })

    return NextResponse.json({ message: "Categoría eliminada" })
  } catch {
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 })
  }
}
