"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency } from "@/lib/utils"
import { CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/Skeleton"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"]

type Transaction = {
  id: string
  amount: number
  description: string
  date: string
  type: string
  category: { name: string; color: string; icon: string }
}

type Budget = {
  id: string
  amount: number
  month: number
  year: number
  categoryId: string
  category: { name: string; color: string; icon: string }
  spent: number
  remaining: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchBudgets()])
  }, [])

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/transactions")
      const data = await res.json()
      setTransactions(data)
    } catch {
      console.error("Error fetching transactions")
    }
  }

  async function fetchBudgets() {
    try {
      const res = await fetch("/api/budgets")
      const data = await res.json()
      setBudgets(data)
    } catch {
      console.error("Error fetching budgets")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: "var(--primary)" }} />
      </div>
    )
  }

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSavings = transactions
    .filter((t) => t.type === "saving")
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses - totalSavings

  const expensesByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, { name: string; value: number; color: string }>>((acc, t) => {
      const key = t.category.name
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, color: t.category.color }
      }
      acc[key].value += t.amount
      return acc
    }, {})

  const pieData = Object.values(expensesByCategory)

  const monthlyData = transactions.reduce<Record<string, { month: string; income: number; expense: number; saving: number }>>((acc, t) => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!acc[key]) {
      acc[key] = { month: key, income: 0, expense: 0, saving: 0 }
    }
    if (t.type === "income") acc[key].income += t.amount
    else if (t.type === "saving") acc[key].saving += t.amount
    else acc[key].expense += t.amount
    return acc
  }, {})

  const barData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)

  const areaData = barData.reduce<Array<{ month: string; balance: number }>>((acc, m) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0
    acc.push({ month: m.month, balance: prev + m.income - m.expense - m.saving })
    return acc
  }, [])

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const activeBudgets = budgets.filter((b) => b.month === currentMonth && b.year === currentYear)

  const recentTransactions = transactions.slice(0, 5)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="shadow-lg rounded-lg p-3 border text-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}>
          <p className="font-medium mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 md:hidden" style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: "var(--text-secondary)" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Dashboard</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
            <p style={{ color: "var(--text-secondary)" }}>Bienvenido, {session?.user?.name || "usuario"}</p>
          </div>

          {loading ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
              <ListSkeleton />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Gastos</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Ahorro</p>
                  <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(totalSavings)}</p>
                </div>
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Disponible</p>
                  <p className="text-2xl font-bold" style={{ color: balance >= 0 ? "var(--primary)" : "var(--expense)" }}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>

              {activeBudgets.length > 0 && (
                <div className="rounded-xl p-5 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Presupuestos del mes</h2>
                  <div className="space-y-3">
                    {activeBudgets.map((b) => {
                      const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
                      const isOver = b.spent > b.amount
                      const isWarning = !isOver && pct > 80
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span style={{ color: "var(--text)" }}>{b.category.icon} {b.category.name}</span>
                            <span style={{ color: isOver ? "var(--expense)" : isWarning ? "#f59e0b" : "var(--text-secondary)" }}>
                              {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                            </span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ backgroundColor: "var(--bg-hover)" }}>
                            <div className="h-2 rounded-full transition-all" style={{
                              width: `${pct}%`,
                              backgroundColor: isOver ? "var(--expense)" : isWarning ? "#f59e0b" : "var(--income)",
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Gastos por categoría</h2>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-12" style={{ color: "var(--text-secondary)" }}>Sin gastos registrados</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Ingresos vs Gastos</h2>
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="saving" name="Ahorro" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-12" style={{ color: "var(--text-secondary)" }}>Sin datos mensuales</p>
                  )}
                </div>
              </div>

              {areaData.length > 1 && (
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Evolución del balance</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" name="Disponible" stroke="var(--primary)" strokeWidth={2} fill="url(#balanceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Últimas transacciones</h2>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{t.category.icon}</span>
                          <div>
                            <p className="font-medium" style={{ color: "var(--text)" }}>{t.description}</p>
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t.category.name}</p>
                          </div>
                        </div>
                        <span className="font-semibold" style={{ color: t.type === "income" ? "var(--income)" : t.type === "saving" ? "#f59e0b" : "var(--expense)" }}>
                          {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{ color: "var(--text-secondary)" }}>
                    No hay transacciones aún. Agrega una desde Transacciones.
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}