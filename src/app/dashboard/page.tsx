"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/Skeleton"
import toast from "react-hot-toast"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"]

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; sign: string }> = {
  entrada: { label: "Entrada", icon: "💰", color: "#22c55e", bg: "rgba(34,197,94,0.12)", sign: "+" },
  salida: { label: "Salida", icon: "💸", color: "#ef4444", bg: "rgba(239,68,68,0.12)", sign: "-" },
  saving: { label: "Ahorro", icon: "🐷", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", sign: "-" },
  retiro_ahorro: { label: "Retiro ahorro", icon: "🏧", color: "#f97316", bg: "rgba(249,115,22,0.12)", sign: "+" },
  deuda: { label: "Deuda", icon: "🏦", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", sign: "+" },
  pago_deuda: { label: "Pago deuda", icon: "🤝", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", sign: "-" },
}

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

type Balance = {
  id: string
  initialBalance: number
  initialSavings: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSavings, setEditingSavings] = useState(false)
  const [savingsInput, setSavingsInput] = useState("")

  useEffect(() => { if (status === "unauthenticated") redirect("/login") }, [status])
  useEffect(() => { Promise.all([fetchTransactions(), fetchBudgets(), fetchBalance()]) }, [])

  async function fetchTransactions() {
    try { const res = await fetch("/api/transactions"); const data = await res.json(); setTransactions(data) }
    catch { console.error("Error fetching transactions") }
  }
  async function fetchBudgets() {
    try { const res = await fetch("/api/budgets"); const data = await res.json(); setBudgets(data) }
    catch { console.error("Error fetching budgets") }
  }
  async function fetchBalance() {
    try { const res = await fetch("/api/balance"); const data = await res.json(); setBalance(data) }
    catch { console.error("Error fetching balance") } finally { setLoading(false) }
  }

  async function saveSavings() {
    const val = parseFloat(savingsInput)
    if (isNaN(val)) { toast.error("Monto inválido"); return }
    try {
      const res = await fetch("/api/balance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialSavings: val }) })
      if (!res.ok) throw new Error()
      setBalance({ ...balance!, initialSavings: val })
      setEditingSavings(false)
      toast.success("Ahorro inicial actualizado")
    } catch { toast.error("Error al guardar") }
  }

  const initialBalance = balance?.initialBalance || 0
  const initialSavings = balance?.initialSavings || 0

  const totalEntradas = transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0)
  const totalSalidas = transactions.filter((t) => t.type === "salida").reduce((s, t) => s + t.amount, 0)
  const totalAhorros = transactions.filter((t) => t.type === "saving").reduce((s, t) => s + t.amount, 0)
  const totalRetirosAhorro = transactions.filter((t) => t.type === "retiro_ahorro").reduce((s, t) => s + t.amount, 0)
  const totalDeudas = transactions.filter((t) => t.type === "deuda").reduce((s, t) => s + t.amount, 0)
  const totalPagosDeuda = transactions.filter((t) => t.type === "pago_deuda").reduce((s, t) => s + t.amount, 0)
  const ahorros = initialSavings + totalAhorros - totalRetirosAhorro
  const disponible = initialBalance + totalEntradas - totalSalidas - totalAhorros + totalRetirosAhorro - totalPagosDeuda

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const gastoHoy = transactions.filter((t) => t.type === "salida" && new Date(t.date).toISOString().split("T")[0] === todayKey).reduce((s, t) => s + t.amount, 0)
  const ingresoHoy = transactions.filter((t) => t.type === "entrada" && new Date(t.date).toISOString().split("T")[0] === todayKey).reduce((s, t) => s + t.amount, 0)

  const expensesByCategory = transactions
    .filter((t) => t.type === "salida")
    .reduce<Record<string, { name: string; value: number; color: string }>>((acc, t) => {
      const key = t.category.name
      if (!acc[key]) acc[key] = { name: key, value: 0, color: t.category.color }
      acc[key].value += t.amount
      return acc
    }, {})
  const pieData = Object.values(expensesByCategory)

  const monthlyData = transactions.reduce<Record<string, { month: string; income: number; expense: number; saving: number; retiroAh: number; deuda: number; pagoDeuda: number }>>((acc, t) => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!acc[key]) acc[key] = { month: key, income: 0, expense: 0, saving: 0, retiroAh: 0, deuda: 0, pagoDeuda: 0 }
    if (t.type === "entrada") acc[key].income += t.amount
    else if (t.type === "salida") acc[key].expense += t.amount
    else if (t.type === "saving") acc[key].saving += t.amount
    else if (t.type === "retiro_ahorro") acc[key].retiroAh += t.amount
    else if (t.type === "deuda") acc[key].deuda += t.amount
    else if (t.type === "pago_deuda") acc[key].pagoDeuda += t.amount
    return acc
  }, {})

  const barData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)

  const areaData = barData.reduce<Array<{ month: string; balance: number }>>((acc, m) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].balance : initialBalance
    acc.push({ month: m.month, balance: prev + m.income - m.expense - m.saving + m.retiroAh + m.deuda - m.pagoDeuda })
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
            <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
          ))}
        </div>
      )
    }
    return null
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: "var(--primary)" }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 md:hidden" style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: "var(--text-secondary)" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>
              <ListSkeleton />
            </>
          ) : (
            <>
              {/* Hoy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>📅</div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Gasto de hoy</p>
                      <p className="text-lg font-bold" style={{ color: "#ef4444" }}>{formatCurrency(gastoHoy)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>💵</div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Ingreso de hoy</p>
                      <p className="text-lg font-bold" style={{ color: "#22c55e" }}>{formatCurrency(ingresoHoy)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>🐷</div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Ahorros</p>
                        {!editingSavings && (
                          <button onClick={() => { setSavingsInput(String(initialSavings)); setEditingSavings(true) }}
                            className="text-xs px-1.5 py-0.5 rounded-md" style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-hover)" }}>✏️</button>
                        )}
                      </div>
                      {editingSavings ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input type="number" step="0.01" value={savingsInput} onChange={(e) => setSavingsInput(e.target.value)}
                            className="w-24 px-2 py-0.5 rounded-lg text-sm font-bold outline-none" style={{ border: "1px solid #f59e0b", backgroundColor: "var(--bg)", color: "var(--text)" }} autoFocus />
                          <button onClick={saveSavings} className="text-xs px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: "#f59e0b" }}>✓</button>
                          <button onClick={() => setEditingSavings(false)} className="text-xs px-2 py-0.5 rounded-lg" style={{ color: "var(--text-secondary)" }}>✕</button>
                        </div>
                      ) : (
                        <p className="text-lg font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(ahorros)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>💰</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Entradas</p>
                  <p className="text-lg font-bold" style={{ color: "#22c55e" }}>{formatCurrency(totalEntradas)}</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>💸</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Salidas</p>
                  <p className="text-lg font-bold" style={{ color: "#ef4444" }}>{formatCurrency(totalSalidas)}</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>🏦</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Deudas</p>
                  <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>{formatCurrency(totalDeudas)}</p>
                </div>
                <div className="rounded-2xl p-5 border-2 col-span-2 sm:col-span-1" style={{ borderColor: disponible >= 0 ? "#6366f1" : "#ef4444", backgroundColor: "var(--bg-card)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: disponible >= 0 ? "rgba(99,102,241,0.12)" : "rgba(239,68,68,0.12)" }}>✨</div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Disponible</p>
                      <p className="text-xl font-bold" style={{ color: disponible >= 0 ? "#6366f1" : "#ef4444" }}>{formatCurrency(disponible)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {activeBudgets.length > 0 && (
                <div className="rounded-2xl p-5 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🎯</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Presupuestos del mes</h2>
                  </div>
                  <div className="space-y-3">
                    {activeBudgets.map((b) => {
                      const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
                      const isOver = b.spent > b.amount
                      const isWarning = !isOver && pct > 80
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span style={{ color: "var(--text)" }}>{b.category.icon} {b.category.name}</span>
                            <span style={{ color: isOver ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e" }}>
                              {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                            </span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ backgroundColor: "var(--bg-hover)" }}>
                            <div className="h-2 rounded-full transition-all" style={{
                              width: `${pct}%`,
                              backgroundColor: isOver ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e",
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🥧</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Gastos por categoría</h2>
                  </div>
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

                <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📊</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Movimientos mensuales</h2>
                  </div>
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Salidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="saving" name="Ahorro" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="deuda" name="Deudas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pagoDeuda" name="Pagos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-12" style={{ color: "var(--text-secondary)" }}>Sin datos mensuales</p>
                  )}
                </div>
              </div>

              {areaData.length > 1 && (
                <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📈</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Evolución del balance</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" name="Disponible" stroke="#6366f1" strokeWidth={2} fill="url(#balanceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🕐</span>
                  <h2 className="font-semibold" style={{ color: "var(--text)" }}>Últimas transacciones</h2>
                </div>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((t) => {
                      const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.salida
                      return (
                        <div key={t.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: cfg.bg }}>{t.category.icon}</div>
                            <div>
                              <p className="font-medium" style={{ color: "var(--text)" }}>{t.description}</p>
                              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{cfg.label} · {t.category.name}</p>
                            </div>
                          </div>
                          <span className="font-semibold" style={{ color: cfg.color }}>
                            {cfg.sign}{formatCurrency(t.amount)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{ color: "var(--text-secondary)" }}>No hay transacciones aún</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
