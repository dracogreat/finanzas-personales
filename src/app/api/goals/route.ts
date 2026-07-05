import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { name, target, saved, deadline, color, icon } = await request.json()

    if (!name || !target) {
      return NextResponse.json({ error: "Nombre y meta requeridos" }, { status: 400 })
    }

    const goal = await prisma.goal.create({
      data: {
        name,
        target: parseFloat(target),
        saved: saved ? parseFloat(saved) : 0,
        deadline: deadline ? new Date(deadline) : null,
        color: color || "#6366f1",
        icon: icon || "🎯",
        userId: session.user.id,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error al crear meta" }, { status: 500 })
  }
}
