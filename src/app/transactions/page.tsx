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
  function toLocalDate(date: Date | string) {
    const d = typeof date === "string" ? new Date(date) : date
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const [form, setForm] = useState({
    amount: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    description: "",
    date: toLocalDate(new Date()),
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
      date: toLocalDate(new Date()),
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
      date: toLocalDate(t.date),
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
  const savingCategories = categories.filter((c) => c.type === "saving")

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: "var(--primary)" }} />
      </div>
    )
  }

  const s = (el: string) => ({})

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <header style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }} className="px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: "var(--text-secondary)" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Transacciones</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Transacciones</h1>
              <p style={{ color: "var(--text-secondary)" }}>Registra tus ingresos y gastos</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
            >
              + Nueva transacción
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["all", "income", "expense", "saving"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors border"
                style={{
                  backgroundColor: filter === f ? "var(--primary)" : "var(--bg-card)",
                  color: filter === f ? "#fff" : "var(--text-secondary)",
                  borderColor: filter === f ? "var(--primary)" : "var(--border)",
                }}
              >
                {f === "all" ? "Todas" : f === "income" ? "Ingresos" : f === "saving" ? "Ahorros" : "Gastos"}
              </button>
            ))}
            <button
              onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" }); setShowCategoryManager(true) }}
              className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
              style={{ color: "var(--text-secondary)", borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              ⚙️ Categorías
            </button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <span className="absolute left-3 top-2" style={{ color: "var(--text-secondary)" }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}
                placeholder="Buscar transacciones..."
              />
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                    {editing ? "Editar transacción" : "Nueva transacción"}
                  </h2>
                  <button onClick={resetForm} className="text-xl" style={{ color: "var(--text-secondary)" }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, type: "expense", categoryId: "" })}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{
                        backgroundColor: form.type === "expense" ? "rgba(239,68,68,0.15)" : "var(--bg)",
                        color: form.type === "expense" ? "#ef4444" : "var(--text-secondary)",
                        borderColor: form.type === "expense" ? "#ef4444" : "var(--border)",
                      }}>
                      💸 Gasto
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, type: "saving", categoryId: "" })}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{
                        backgroundColor: form.type === "saving" ? "rgba(245,158,11,0.15)" : "var(--bg)",
                        color: form.type === "saving" ? "#f59e0b" : "var(--text-secondary)",
                        borderColor: form.type === "saving" ? "#f59e0b" : "var(--border)",
                      }}>
                      🐷 Ahorro
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, type: "income", categoryId: "" })}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{
                        backgroundColor: form.type === "income" ? "rgba(34,197,94,0.15)" : "var(--bg)",
                        color: form.type === "income" ? "#22c55e" : "var(--text-secondary)",
                        borderColor: form.type === "income" ? "#22c55e" : "var(--border)",
                      }}>
                      💰 Ingreso
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Categoría</label>
                    <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg outline-none"
                      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                      <option value="">Seleccionar categoría</option>
                      {(form.type === "income" ? incomeCategories : form.type === "saving" ? savingCategories : expenseCategories).map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Cantidad</label>
                      <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg outline-none"
                        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Precio Unitario</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5" style={{ color: "var(--text-secondary)" }}>S/</span>
                        <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => handleUnitPriceChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none"
                          style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                          placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Total</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5" style={{ color: "var(--text-secondary)" }}>S/</span>
                      <input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg font-semibold outline-none"
                        style={{ border: "2px solid var(--primary)", backgroundColor: "rgba(99,102,241,0.08)", color: "var(--text)" }}
                        placeholder="0.00" />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Se calcula automáticamente si pones cantidad y precio unitario</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Descripción</label>
                    <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg outline-none"
                      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                      placeholder="¿Qué compraste?" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Observaciones</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg outline-none resize-none"
                      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                      placeholder="Detalles adicionales..." rows={2} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Fecha</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg outline-none"
                      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={resetForm}
                      className="flex-1 py-2.5 rounded-lg transition-colors border"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                      Cancelar
                    </button>
                    <button type="submit"
                      className="flex-1 py-2.5 text-white rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: "var(--primary)" }}>
                      {editing ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: "var(--primary)" }} />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="rounded-xl shadow-sm border divide-y" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              {filteredTransactions.map((t) => {
                const unitPrice = t.quantity && t.quantity > 0 ? t.amount / t.quantity : null
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 transition-colors" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl flex-shrink-0">{t.category.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ color: "var(--text)" }}>{t.description}</p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {t.category.name} · {formatDate(t.date)}
                          {t.quantity && unitPrice ? ` · ${t.quantity} und. x S/ ${unitPrice.toFixed(2)}` : ""}
                        </p>
                        {t.notes && (
                          <p className="text-xs italic truncate" style={{ color: "var(--text-secondary)" }}>📝 {t.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="font-semibold"
                        style={{ color: t.type === "income" ? "var(--income)" : t.type === "saving" ? "#f59e0b" : "var(--expense)" }}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </span>
                      <button onClick={() => handleEdit(t)} className="text-sm p-1" style={{ color: "var(--text-secondary)" }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} className="text-sm p-1" style={{ color: "var(--text-secondary)" }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
              <p className="text-4xl mb-2">📭</p>
              <p>No hay transacciones registradas</p>
            </div>
          )}

          {showCategoryManager && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Gestionar categorías</h2>
                  <button onClick={() => setShowCategoryManager(false)} className="text-xl" style={{ color: "var(--text-secondary)" }}>✕</button>
                </div>

                <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="flex flex-wrap gap-2 mb-4">
                  <input type="text" required value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                    placeholder="Nombre" />
                  <select value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    className="px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                    <option value="saving">Ahorro</option>
                  </select>
                  <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border" style={{ borderColor: "var(--border)" }} />
                  <select value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="px-2 py-2 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                    {iconOptions.map((ico) => (<option key={ico} value={ico}>{ico}</option>))}
                  </select>
                  <button type="submit" className="px-3 py-2 text-white rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: "var(--primary)" }}>
                    {editingCategory ? "Actualizar" : "Agregar"}
                  </button>
                </form>

                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg" style={{ color: "var(--text)" }}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: cat.type === "income" ? "rgba(34,197,94,0.15)" : cat.type === "saving" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                            color: cat.type === "income" ? "#22c55e" : cat.type === "saving" ? "#f59e0b" : "#ef4444",
                          }}>
                          {cat.type === "income" ? "Ingreso" : cat.type === "saving" ? "Ahorro" : "Gasto"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon }); setShowCategoryManager(true) }}
                          className="text-sm p-1" style={{ color: "var(--text-secondary)" }}>✏️</button>
                        <button onClick={() => handleDeleteCategory(cat.id)}
                          className="text-sm p-1" style={{ color: "var(--text-secondary)" }}>🗑️</button>
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
