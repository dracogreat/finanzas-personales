import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePendingTransactions } from "@/lib/recurring"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const newlyCreated = await generatePendingTransactions(session.user.id)

  const pendingCount = await prisma.transaction.count({
    where: { userId: session.user.id, status: "pending" },
  })

  return NextResponse.json({ pendingCount, newlyCreated })
}
