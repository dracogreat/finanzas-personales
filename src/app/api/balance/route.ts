import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let balance = await prisma.balance.findUnique({
    where: { userId: session.user.id },
  })

  if (!balance) {
    balance = await prisma.balance.create({
      data: { userId: session.user.id, initialBalance: 0, initialSavings: 0 },
    })
  }

  return NextResponse.json(balance)
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { initialBalance, initialSavings } = await request.json()

  const data: Record<string, number> = {}
  if (initialBalance !== undefined) data.initialBalance = parseFloat(initialBalance)
  if (initialSavings !== undefined) data.initialSavings = parseFloat(initialSavings)

  const balance = await prisma.balance.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, initialBalance: data.initialBalance || 0, initialSavings: data.initialSavings || 0 },
  })

  return NextResponse.json(balance)
}