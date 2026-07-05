import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { name, type, color, icon } = await request.json()

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nombre y tipo son requeridos" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color: color || "#6366f1",
        icon: icon || "📦",
        userId: session.user.id,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    )
  }
}
