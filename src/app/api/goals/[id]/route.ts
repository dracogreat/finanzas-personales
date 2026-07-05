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
    const existing = await prisma.goal.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 })
    }

    const { name, target, saved, deadline, color, icon } = await request.json()

    const goal = await prisma.goal.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(target && { target: parseFloat(target) }),
        ...(saved !== undefined && { saved: parseFloat(saved) }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(color && { color }),
        ...(icon && { icon }),
      },
    })

    return NextResponse.json(goal)
  } catch {
    return NextResponse.json({ error: "Error al actualizar meta" }, { status: 500 })
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
    const existing = await prisma.goal.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 })
    }

    await prisma.goal.delete({ where: { id: params.id } })

    return NextResponse.json({ message: "Meta eliminada" })
  } catch {
    return NextResponse.json({ error: "Error al eliminar meta" }, { status: 500 })
  }
}
