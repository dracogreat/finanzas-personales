import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const rules = await prisma.categoryRule.findMany({
    where: { userId: session.user.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(rules)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { pattern, categoryId } = await request.json()

    if (!pattern || !categoryId) {
      return NextResponse.json(
        { error: "Patrón y categoría requeridos" },
        { status: 400 }
      )
    }

    const existing = await prisma.categoryRule.findUnique({
      where: { userId_pattern: { userId: session.user.id, pattern: pattern.toLowerCase() } },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una regla para este patrón" },
        { status: 400 }
      )
    }

    const rule = await prisma.categoryRule.create({
      data: {
        pattern: pattern.toLowerCase(),
        categoryId,
        userId: session.user.id,
      },
      include: { category: true },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear regla" },
      { status: 500 }
    )
  }
}
