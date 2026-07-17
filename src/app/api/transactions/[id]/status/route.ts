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
    const { status } = await request.json()

    if (!status || !["confirmed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    }

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Solo se pueden cambiar transacciones pendientes" }, { status: 400 })
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { status },
      include: { category: true },
    })

    return NextResponse.json(transaction)
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
