"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency } from "@/lib/utils"
import toast from "react-hot-toast"

type Category = {
  id: string
  name: string
  type: string
  color: string
  icon: string
}

type Budget = {
  id: string
  amount: number
  month: number
  year: number
  categoryId: string
  category: Category
  spent: number
  remaining: number
}

export default function BudgetsPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState({ amount: "", categoryId: "" })

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => {
    Promise.all([fetchBudgets(), fetchCategories()])
  }, [currentMonth, currentYear])

  async function fetchBudgets() {
    try {
      const res = await fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`)
      const data = await res.json()
      setBudgets(data)
    } catch {
      toast.error("Error al cargar presupuestos")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data.filter((c: Category) => c.type === "expense"))
    } catch {
      console.error("Error loading categories")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.amount || !form.categoryId) {
      toast.error("Completa todos los campos")
      return
    }

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: form.amount,
          month: currentMonth,
          year: currentYear,
          categoryId: form.categoryId,
        }),
      })

      if (!res.ok) throw new Error()

      toast.success("Presupuesto guardado")
      setForm({ amount: "", categoryId: "" })
      setShowForm(false)
      fetchBudgets()
    } catch {
      toast.error("Error al guardar presupuesto")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return

    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Presupuesto eliminado")
      fetchBudgets()
    } catch {
      toast.error("Error al eliminar presupuesto")
    }
  }

  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"]

  function changeMonth(delta: number) {
    let m = currentMonth + delta
    let y = currentYear
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  const budgetedCategories = budgets.map((b) => b.categoryId)
  const availableCategories = categories.filter((c) => !budgetedCategories.includes(c.id))

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold">Presupuestos</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
              <p className="text-gray-500">Establece límites mensuales por categoría</p>
            </div>
            {availableCategories.length > 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                + Nuevo presupuesto
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ◀
            </button>
            <h2 className="text-lg font-semibold text-gray-700 min-w-[200px] text-center">
              {months[currentMonth - 1]} {currentYear}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ▶
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : budgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map((budget) => {
                const percentage = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
                const isOver = budget.spent > budget.amount

                return (
                  <div key={budget.id} className="bg-white rounded-xl p-5 shadow-sm border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{budget.category.icon}</span>
                        <div>
                          <p className="font-medium text-gray-800">{budget.category.name}</p>
                          <p className="text-xs text-gray-400">Presupuesto: {formatCurrency(budget.amount)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="text-gray-400 hover:text-red-600 text-sm"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={isOver ? "text-red-600 font-medium" : "text-gray-600"}>
                          Gastado: {formatCurrency(budget.spent)}
                        </span>
                        <span className={isOver ? "text-red-600 font-medium" : "text-green-600"}>
                          {isOver ? `-${formatCurrency(Math.abs(budget.remaining))}` : `${formatCurrency(budget.remaining)} disponible`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            isOver ? "bg-red-500" : percentage > 80 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🎯</p>
              <p>No hay presupuestos para este mes</p>
              <p className="text-sm">Agrega uno para empezar a controlar tus gastos</p>
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Nuevo presupuesto</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Seleccionar categoría</option>
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Límite mensual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
