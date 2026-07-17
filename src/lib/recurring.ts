import { prisma } from "@/lib/prisma"

export function advanceNextDate(date: Date, frequency: string): Date {
  const next = new Date(date)
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1)
      break
    case "weekly":
      next.setDate(next.getDate() + 7)
      break
    case "biweekly":
      next.setDate(next.getDate() + 14)
      break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      if (next.getDate() > lastDay) next.setDate(lastDay)
      break
    case "yearly":
      next.setFullYear(next.getFullYear() + 1)
      const febLast = new Date(next.getFullYear(), 2, 0).getDate()
      if (next.getDate() > febLast) next.setDate(febLast)
      break
  }
  return next
}

export async function generatePendingTransactions(userId: string): Promise<number> {
  const now = new Date()
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextDate: { lte: now } },
  })

  let count = 0

  for (const rec of recurring) {
    let nextDate = new Date(rec.nextDate)
    while (nextDate <= now) {
      const txDate = new Date(nextDate)
      txDate.setHours(12, 0, 0, 0)

      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          recurringId: rec.id,
          date: {
            gte: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()),
            lt: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate() + 1),
          },
        },
      })

      if (!existing) {
        await prisma.transaction.create({
          data: {
            amount: rec.amount,
            description: rec.description,
            date: txDate,
            type: rec.type,
            status: "pending",
            categoryId: rec.categoryId,
            userId,
            recurringId: rec.id,
          },
        })
        count++
      }

      nextDate = advanceNextDate(nextDate, rec.frequency)
    }

    await prisma.recurringTransaction.update({
      where: { id: rec.id },
      data: { nextDate },
    })
  }

  return count
}
