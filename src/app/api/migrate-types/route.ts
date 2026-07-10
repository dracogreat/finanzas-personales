import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const result = await prisma.$executeRaw`
    UPDATE "Transaction" SET type = 'entrada' WHERE type = 'income'
  `
  const result2 = await prisma.$executeRaw`
    UPDATE "Transaction" SET type = 'salida' WHERE type = 'expense'
  `
  return NextResponse.json({ migrated: Number(result) + Number(result2) })
}