"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"

type Category = {
  id: string
  name: string
  type: string
  color: string
  icon: string
}

type Transaction = {
  id: string
  amount: number
  quantity: number | null
  notes: string | null
  description: string
  date: string
  type: string
  categoryId: string
  category: Category
}

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "expense", color: "#6366f1", icon: "📦" })
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({
    amount: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense",
    categoryId: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchCategories()])
  }, [])

  function calcTotal(q: string, up: string) {
    const qty = parseFloat(q) || 0
    const price = parseFloat(up) || 0
    if (qty > 0 && price > 0) {
      return (qty * price).toFixed(2)
    }
    return ""
  }

  function handleQuantityChange(value: string) {
    setForm((prev) => ({
      ...prev,
      quantity: value,
      amount: calcTotal(value, prev.unitPrice),
    }))
  }

  function handleUnitPriceChange(value: string) {
    setForm((prev) => ({
      ...prev,
      unitPrice: value,
      amount: calcTotal(prev.quantity, value),
    }))
  }

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/transactions")
      const data = await res.json()
      setTransactions(data)
    } catch {
      toast.error("Error al cargar transacciones")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data)
    } catch {
      console.error("Error loading categories")
    }
  }

  function resetForm() {
    setForm({
      amount: "",
      quantity: "",
      unitPrice: "",
      notes: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      type: "expense",
      categoryId: "",
    })
    setEditing(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.amount || !form.description || !form.categoryId) {
      toast.error("Completa todos los campos")
      return
    }

    try {
      const url = editing
        ? `/api/transactions/${editing.id}`
        : "/api/transactions"
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: form.amount,
          quantity: form.quantity || null,
          notes: form.notes || null,
          description: form.description,
          date: form.date,
          type: form.type,
          categoryId: form.categoryId,
        }),
      })

      if (!res.ok) throw new Error()

      toast.success(editing ? "Transacción actualizada" : "Transacción creada")
      resetForm()
      fetchTransactions()
    } catch {
      toast.error("Error al guardar transacción")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta transacción?")) return

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Transacción eliminada")
      fetchTransactions()
    } catch {
      toast.error("Error al eliminar transacción")
    }
  }

  function handleEdit(t: Transaction) {
    const unitPrice = t.quantity && t.quantity > 0 ? (t.amount / t.quantity).toFixed(2) : ""
    setEditing(t)
    setForm({
      amount: String(t.amount),
      quantity: t.quantity ? String(t.quantity) : "",
      unitPrice,
      notes: t.notes || "",
      description: t.description,
      date: new Date(t.date).toISOString().split("T")[0],
      type: t.type,
      categoryId: t.categoryId,
    })
    setShowForm(true)
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryForm.name) { toast.error("Nombre requerido"); return }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      })
      if (!res.ok) throw new Error()
      toast.success("Categoría creada")
      setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" })
      fetchCategories()
    } catch { toast.error("Error al crear categoría") }
  }

  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCategory || !categoryForm.name) { toast.error("Nombre requerido"); return }
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      })
      if (!res.ok) throw new Error()
      toast.success("Categoría actualizada")
      setEditingCategory(null)
      setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" })
      fetchCategories()
    } catch { toast.error("Error al actualizar categoría") }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Error"); return }
      toast.success("Categoría eliminada")
      fetchCategories()
    } catch { toast.error("Error al eliminar categoría") }
  }

  const iconOptions = ["💰","💵","💳","🏠","🚗","🍕","🎮","📚","🏥","💡","🛍️","🎬","✈️","👕","💻","📱","🐱","🎁","🏋️","☕","🎵","📦"]

  const filteredTransactions = transactions
    .filter((t) => filter === "all" || t.type === filter)
    .filter((t) =>
      !search || t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
    )

  const incomeCategories = categories.filter((c) => c.type === "income")
  const expenseCategories = categories.filter((c) => c.type === "expense")

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
          <h1 className="font-semibold">Transacciones</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-gray-800">Transacciones</h1>
              <p className="text-gray-500">Registra tus ingresos y gastos</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + Nueva transacción
            </button>
          </div>

          <div className="flex items-center gap-2">
            {["all", "income", "expense"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 border hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "Todas" : f === "income" ? "Ingresos" : "Gastos"}
              </button>
            ))}
            <button
              onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" }); setShowCategoryManager(true) }}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border hover:bg-gray-50 transition-colors"
            >
              ⚙️ Categorías
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Buscar transacciones..."
            />
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {editing ? "Editar transacción" : "Nueva transacción"}
                  </h2>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "expense", categoryId: "" })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.type === "expense"
                          ? "bg-red-100 text-red-700 border border-red-300"
                          : "bg-gray-50 text-gray-500 border"
                      }`}
                    >
                      💸 Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "income", categoryId: "" })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.type === "income"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-gray-50 text-gray-500 border"
                      }`}
                    >
                      💰 Ingreso
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Seleccionar categoría</option>
                      {(form.type === "income" ? incomeCategories : expenseCategories).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">S/</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.unitPrice}
                          onChange={(e) => handleUnitPriceChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-indigo-300 bg-indigo-50 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Se calcula automáticamente si pones cantidad y precio unitario</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="¿Qué compraste?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Detalles adicionales..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      {editing ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {filteredTransactions.map((t) => {
                const unitPrice = t.quantity && t.quantity > 0 ? t.amount / t.quantity : null
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl flex-shrink-0">{t.category.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate">{t.description}</p>
                        <p className="text-sm text-gray-400">
                          {t.category.name} · {formatDate(t.date)}
                          {t.quantity && unitPrice ? ` · ${t.quantity} und. x S/ ${unitPrice.toFixed(2)}` : ""}
                        </p>
                        {t.notes && (
                          <p className="text-xs text-gray-400 italic truncate">📝 {t.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </span>
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-gray-400 hover:text-gray-600 text-sm p-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-400 hover:text-red-600 text-sm p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p>No hay transacciones registradas</p>
            </div>
          )}

          {showCategoryManager && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Gestionar categorías</h2>
                  <button onClick={() => setShowCategoryManager(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Nombre"
                  />
                  <select
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border"
                  />
                  <select
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  >
                    {iconOptions.map((ico) => (
                      <option key={ico} value={ico}>{ico}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  >
                    {editingCategory ? "Actualizar" : "Agregar"}
                  </button>
                </form>

                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm">{cat.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${cat.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {cat.type === "income" ? "Ingreso" : "Gasto"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon }); setShowCategoryManager(true) }}
                          className="text-gray-400 hover:text-gray-600 text-sm p-1"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-gray-400 hover:text-red-600 text-sm p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
