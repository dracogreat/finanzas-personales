"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/transactions")
      const data = await res.json()
      setTransactions(data)
    } catch {
      console.error("Error fetching transactions")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses

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

  const monthlyData = transactions.reduce<Record<string, { month: string; income: number; expense: number }>>((acc, t) => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!acc[key]) {
      acc[key] = { month: key, income: 0, expense: 0 }
    }
    if (t.type === "income") acc[key].income += t.amount
    else acc[key].expense += t.amount
    return acc
  }, {})

  const barData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)

  const recentTransactions = transactions.slice(0, 5)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-lg rounded-lg p-3 border text-sm">
          <p className="font-medium">{label}</p>
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold">Dashboard</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500">Bienvenido, {session?.user?.name || "usuario"}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <p className="text-sm text-gray-500">Ingresos totales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <p className="text-sm text-gray-500">Gastos totales</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <p className="text-sm text-gray-500">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? "text-indigo-600" : "text-red-600"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-800 mb-4">Gastos por categoría</h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-12">Sin gastos registrados</p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="font-semibold text-gray-800 mb-4">Ingresos vs Gastos</h2>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-12">Sin datos mensuales</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="font-semibold text-gray-800 mb-4">Últimas transacciones</h2>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{t.category.icon}</span>
                      <div>
                        <p className="font-medium text-gray-800">{t.description}</p>
                        <p className="text-sm text-gray-400">{t.category.name}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No hay transacciones aún. Agrega una desde Transacciones.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
