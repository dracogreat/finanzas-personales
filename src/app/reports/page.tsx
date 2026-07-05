"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts"
import toast from "react-hot-toast"

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"]

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

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => {
    fetchTransactions()
  }, [selectedYear, selectedMonth])

  async function fetchTransactions() {
    setLoading(true)
    try {
      let url = "/api/transactions"
      const params = new URLSearchParams()
      if (selectedMonth) {
        params.set("month", selectedMonth)
        params.set("year", String(selectedYear))
      }
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()
      setTransactions(data)
    } catch {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    try {
      let url = "/api/export"
      const params = new URLSearchParams()
      if (selectedMonth) {
        params.set("month", selectedMonth)
        params.set("year", String(selectedYear))
      }
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const blob = await res.blob()
      const urlBlob = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = urlBlob
      a.download = selectedMonth
        ? `transacciones-${selectedYear}-${selectedMonth.padStart(2, "0")}.csv`
        : "transacciones.csv"
      a.click()
      window.URL.revokeObjectURL(urlBlob)
      toast.success("Archivo descargado")
    } catch {
      toast.error("Error al exportar")
    }
  }

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  const byCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, { name: string; value: number; color: string }>>((acc, t) => {
      const key = t.category.name
      if (!acc[key]) acc[key] = { name: key, value: 0, color: t.category.color }
      acc[key].value += t.amount
      return acc
    }, {})

  const pieData = Object.values(byCategory).sort((a, b) => b.value - a.value)

  const byDay = transactions.reduce<Record<string, { date: string; income: number; expense: number }>>((acc, t) => {
    const d = new Date(t.date).toISOString().split("T")[0]
    if (!acc[d]) acc[d] = { date: d, income: 0, expense: 0 }
    if (t.type === "income") acc[d].income += t.amount
    else acc[d].expense += t.amount
    return acc
  }, {})

  const lineData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))

  const byMonth = transactions.reduce<Record<string, { month: string; income: number; expense: number }>>((acc, t) => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!acc[key]) acc[key] = { month: key, income: 0, expense: 0 }
    if (t.type === "income") acc[key].income += t.amount
    else acc[key].expense += t.amount
    return acc
  }, {})

  const monthlyBarData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))

  const months = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"]

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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    )
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
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Reportes</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Reportes</h1>
            <p style={{ color: "var(--text-secondary)" }}>Analiza tus finanzas</p>
          </div>
          <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todo el año</option>
                {months.slice(1).map((name, i) => (
                  <option key={i + 1} value={String(i + 1)}>{name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                📥 Exportar CSV
              </button>
            </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : transactions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Gastos</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Balance</p>
                  <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-indigo-600" : "text-red-600"}`}>
                    {formatCurrency(totalIncome - totalExpenses)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Gastos por categoría</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
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
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Evolución diaria</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="income" name="Ingresos" stroke="#22c55e" strokeWidth={2} />
                      <Line type="monotone" dataKey="expense" name="Gastos" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {!selectedMonth && (
                <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Ingresos vs Gastos mensuales</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Resumen de transacciones</h2>
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
                      {transactions.slice(0, 20).map((t) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                          <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                            {new Date(t.date).toLocaleDateString("es-PE")}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {t.type === "income" ? "Ingreso" : "Gasto"}
                            </span>
                          </td>
                          <td className="py-2 px-2">{t.category.icon} {t.category.name}</td>
                          <td className="py-2 px-2" style={{ color: "var(--text)" }}>{t.description}</td>
                          <td className={`py-2 px-2 text-right font-medium ${
                            t.type === "income" ? "text-green-600" : "text-red-600"
                          }`}>
                            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
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
