"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton, CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/Skeleton"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts"
import toast from "react-hot-toast"

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
  category: { id: string; name: string; color: string; icon: string }
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => { if (status === "unauthenticated") redirect("/login") }, [status])
  useEffect(() => { fetchTransactions() }, [selectedYear, selectedMonth, selectedDay])

  async function fetchTransactions() {
    setLoading(true)
    try {
      let url = "/api/transactions"
      const params = new URLSearchParams()
      if (selectedDay) {
        params.set("date", selectedDay)
      } else if (selectedMonth) {
        params.set("month", selectedMonth)
        params.set("year", String(selectedYear))
      }
      if (params.toString()) url += `?${params.toString()}`
      const res = await fetch(url)
      const data = await res.json()
      setTransactions(data)
    } catch { toast.error("Error al cargar datos") } finally { setLoading(false) }
  }

  async function handleExport() {
    try {
      let url = "/api/export"
      const params = new URLSearchParams()
      if (selectedDay) {
        params.set("date", selectedDay)
      } else if (selectedMonth) {
        params.set("month", selectedMonth)
        params.set("year", String(selectedYear))
      }
      if (params.toString()) url += `?${params.toString()}`
      const res = await fetch(url)
      const blob = await res.blob()
      const urlBlob = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = urlBlob
      a.download = selectedDay
        ? `transacciones-${selectedDay}.csv`
        : selectedMonth
          ? `transacciones-${selectedYear}-${selectedMonth.padStart(2, "0")}.csv`
          : "transacciones.csv"
      a.click()
      window.URL.revokeObjectURL(urlBlob)
      toast.success("Archivo descargado")
    } catch { toast.error("Error al exportar") }
  }

  const filteredByType = typeFilter === "all" ? transactions : transactions.filter((t) => t.type === typeFilter)

  const totalEntradas = filteredByType.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0)
  const totalSalidas = filteredByType.filter((t) => t.type === "salida").reduce((s, t) => s + t.amount, 0)
  const totalAhorros = filteredByType.filter((t) => t.type === "saving").reduce((s, t) => s + t.amount, 0)
  const totalRetiros = filteredByType.filter((t) => t.type === "retiro_ahorro").reduce((s, t) => s + t.amount, 0)
  const totalDeudas = filteredByType.filter((t) => t.type === "deuda").reduce((s, t) => s + t.amount, 0)
  const totalPagosDeuda = filteredByType.filter((t) => t.type === "pago_deuda").reduce((s, t) => s + t.amount, 0)
  const disponible = totalEntradas - totalSalidas - totalAhorros + totalRetiros + totalDeudas - totalPagosDeuda

  const byCategory = filteredByType
    .filter((t) => t.type === "salida")
    .reduce<Record<string, { name: string; value: number; color: string }>>((acc, t) => {
      const key = t.category.name
      if (!acc[key]) acc[key] = { name: key, value: 0, color: t.category.color }
      acc[key].value += t.amount
      return acc
    }, {})
  const pieData = Object.values(byCategory).sort((a, b) => b.value - a.value)

  const byDay = filteredByType.reduce<Record<string, { date: string; income: number; expense: number; saving: number; deuda: number; pagoDeuda: number }>>((acc, t) => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!acc[key]) acc[key] = { date: key, income: 0, expense: 0, saving: 0, deuda: 0, pagoDeuda: 0 }
    if (t.type === "entrada") acc[key].income += t.amount
    else if (t.type === "salida") acc[key].expense += t.amount
    else if (t.type === "saving") acc[key].saving += t.amount
    else if (t.type === "deuda") acc[key].deuda += t.amount
    else if (t.type === "pago_deuda") acc[key].pagoDeuda += t.amount
    return acc
  }, {})
  const lineData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))

  const byMonth = filteredByType.reduce<Record<string, { month: string; income: number; expense: number; saving: number; deuda: number; pagoDeuda: number }>>((acc, t) => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!acc[key]) acc[key] = { month: key, income: 0, expense: 0, saving: 0, deuda: 0, pagoDeuda: 0 }
    if (t.type === "entrada") acc[key].income += t.amount
    else if (t.type === "salida") acc[key].expense += t.amount
    else if (t.type === "saving") acc[key].saving += t.amount
    else if (t.type === "deuda") acc[key].deuda += t.amount
    else if (t.type === "pago_deuda") acc[key].pagoDeuda += t.amount
    return acc
  }, {})
  const monthlyBarData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))

  const months = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="shadow-lg rounded-lg p-3 border text-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}>
          <p className="font-medium mb-1">{label}</p>
          {payload.map((p: any) => (<p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>))}
        </div>
      )
    }
    return null
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-48" /></div>
          <div className="flex gap-3"><Skeleton className="h-10 w-full max-w-[200px]" /><Skeleton className="h-10 w-full max-w-[100px]" /><Skeleton className="h-10 w-36" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>
          <ChartSkeleton /><ListSkeleton />
        </div>
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
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Reportes</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Reportes</h1>
            <p style={{ color: "var(--text-secondary)" }}>Analiza tus finanzas</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay("") }}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}>
              <option value="">Todo el año</option>
              {months.slice(1).map((name, i) => (<option key={i + 1} value={String(i + 1)}>{name}</option>))}
            </select>
            <input type="date" value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); setSelectedMonth("") }}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }} />
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}>
              {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <button onClick={handleExport} className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-colors" style={{ backgroundColor: "#22c55e" }}>
              📥 Exportar CSV
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[["all", "Todos", "📋"], ["entrada", "Entradas", "💰"], ["salida", "Salidas", "💸"], ["saving", "Ahorros", "🐷"], ["retiro_ahorro", "Retiros", "🏧"], ["deuda", "Deudas", "🏦"], ["pago_deuda", "Pagos", "🤝"]].map(([key, label, icon]) => (
              <button key={key} onClick={() => setTypeFilter(key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border"
                style={{
                  backgroundColor: typeFilter === key ? (TYPE_CONFIG[key]?.color || "var(--primary)") : "var(--bg-card)",
                  color: typeFilter === key ? "#fff" : "var(--text-secondary)",
                  borderColor: typeFilter === key ? (TYPE_CONFIG[key]?.color || "var(--primary)") : "var(--border)",
                }}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>

          {loading ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ChartSkeleton /><ChartSkeleton /></div>
              <ChartSkeleton /><ListSkeleton />
            </>
          ) : filteredByType.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl p-4 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>💰</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Entradas</p>
                  <p className="text-xl font-bold" style={{ color: "#22c55e" }}>{formatCurrency(totalEntradas)}</p>
                </div>
                <div className="rounded-xl p-4 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>💸</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Salidas</p>
                  <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{formatCurrency(totalSalidas)}</p>
                </div>
                <div className="rounded-xl p-4 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>🤝</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>P. Deuda</p>
                  <p className="text-xl font-bold" style={{ color: "#8b5cf6" }}>{formatCurrency(totalPagosDeuda)}</p>
                </div>
                <div className="rounded-xl p-4 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2" style={{ backgroundColor: disponible >= 0 ? "rgba(99,102,241,0.12)" : "rgba(239,68,68,0.12)" }}>✨</div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Disponible</p>
                  <p className="text-xl font-bold" style={{ color: disponible >= 0 ? "#6366f1" : "#ef4444" }}>{formatCurrency(disponible)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🥧</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Salidas por categoría</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => (<Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-3">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}: {formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📈</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Evolución diaria</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="income" name="Entradas" stroke="#22c55e" strokeWidth={2} />
                      <Line type="monotone" dataKey="expense" name="Salidas" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="saving" name="Ahorro" stroke="#f59e0b" strokeWidth={2} />
                      <Line type="monotone" dataKey="deuda" name="Deudas" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="pagoDeuda" name="Pagos" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {!selectedMonth && !selectedDay && (
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📊</span>
                    <h2 className="font-semibold" style={{ color: "var(--text)" }}>Movimientos mensuales</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyBarData}>
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
                </div>
              )}

              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📋</span>
                  <h2 className="font-semibold" style={{ color: "var(--text)" }}>Detalle de transacciones</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        <th className="text-left py-2 px-2">Fecha</th>
                        <th className="text-left py-2 px-2">Tipo</th>
                        <th className="text-left py-2 px-2">Categoría</th>
                        <th className="text-left py-2 px-2">Descripción</th>
                        <th className="text-right py-2 px-2">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredByType.slice(0, 20).map((t) => {
                        const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.salida
                        return (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                            <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{formatDate(t.date)}</td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            </td>
                            <td className="py-2 px-2">{t.category.icon} {t.category.name}</td>
                            <td className="py-2 px-2" style={{ color: "var(--text)" }}>{t.description}</td>
                            <td className="py-2 px-2 text-right font-medium" style={{ color: cfg.color }}>
                              {cfg.sign}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
              <p className="text-4xl mb-2">📊</p>
              <p>No hay datos para mostrar en este período</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
