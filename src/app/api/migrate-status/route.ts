import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const result = await prisma.transaction.updateMany({
      where: { userId: session.user.id, status: { not: "pending" } },
      data: { status: "confirmed" },
    })

    return NextResponse.json({ message: "Migración completada", migrated: result.count })
  } catch {
    return NextResponse.json({ error: "Error en migración" }, { status: 500 })
  }
}
