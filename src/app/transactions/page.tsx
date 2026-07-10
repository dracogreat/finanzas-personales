"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton, ListSkeleton } from "@/components/Skeleton"
import toast from "react-hot-toast"

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; sign: string }> = {
  entrada: { label: "Entrada", icon: "💰", color: "#22c55e", bg: "rgba(34,197,94,0.12)", sign: "+" },
  salida: { label: "Salida", icon: "💸", color: "#ef4444", bg: "rgba(239,68,68,0.12)", sign: "-" },
  saving: { label: "Ahorro", icon: "🐷", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", sign: "-" },
  deuda: { label: "Deuda", icon: "🏦", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", sign: "+" },
  pago_deuda: { label: "Pago deuda", icon: "🤝", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", sign: "-" },
}

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
    type: "salida",
    categoryId: "",
  })

  useEffect(() => { if (status === "unauthenticated") redirect("/login") }, [status])
  useEffect(() => { Promise.all([fetchTransactions(), fetchCategories()]) }, [])

  function calcTotal(q: string, up: string) {
    const qty = parseFloat(q) || 0
    const price = parseFloat(up) || 0
    return qty > 0 && price > 0 ? (qty * price).toFixed(2) : ""
  }
  function handleQuantityChange(value: string) {
    setForm((prev) => ({ ...prev, quantity: value, amount: calcTotal(value, prev.unitPrice) }))
  }
  function handleUnitPriceChange(value: string) {
    setForm((prev) => ({ ...prev, unitPrice: value, amount: calcTotal(prev.quantity, value) }))
  }

  async function fetchTransactions() {
    try { const res = await fetch("/api/transactions"); const data = await res.json(); setTransactions(data) }
    catch { toast.error("Error al cargar transacciones") } finally { setLoading(false) }
  }
  async function fetchCategories() {
    try { const res = await fetch("/api/categories"); const data = await res.json(); setCategories(data) }
    catch { console.error("Error loading categories") }
  }

  function resetForm() {
    setForm({ amount: "", quantity: "", unitPrice: "", notes: "", description: "", date: toLocalDate(new Date()), type: "salida", categoryId: "" })
    setEditing(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description || !form.categoryId) { toast.error("Completa todos los campos"); return }
    try {
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: form.amount, quantity: form.quantity || null, notes: form.notes || null, description: form.description, date: form.date, type: form.type, categoryId: form.categoryId }),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? "Transacción actualizada" : "Transacción creada")
      resetForm(); fetchTransactions()
    } catch { toast.error("Error al guardar transacción") }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta transacción?")) return
    try { const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Transacción eliminada"); fetchTransactions() }
    catch { toast.error("Error al eliminar transacción") }
  }

  function handleEdit(t: Transaction) {
    const unitPrice = t.quantity && t.quantity > 0 ? (t.amount / t.quantity).toFixed(2) : ""
    setEditing(t)
    setForm({ amount: String(t.amount), quantity: t.quantity ? String(t.quantity) : "", unitPrice, notes: t.notes || "", description: t.description, date: toLocalDate(t.date), type: t.type, categoryId: t.categoryId })
    setShowForm(true)
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryForm.name) { toast.error("Nombre requerido"); return }
    try { const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(categoryForm) }); if (!res.ok) throw new Error(); toast.success("Categoría creada"); setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" }); fetchCategories() }
    catch { toast.error("Error al crear categoría") }
  }
  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCategory || !categoryForm.name) { toast.error("Nombre requerido"); return }
    try { const res = await fetch(`/api/categories/${editingCategory.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(categoryForm) }); if (!res.ok) throw new Error(); toast.success("Categoría actualizada"); setEditingCategory(null); setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" }); fetchCategories() }
    catch { toast.error("Error al actualizar categoría") }
  }
  async function handleDeleteCategory(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return
    try { const res = await fetch(`/api/categories/${id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) { toast.error(data.error || "Error"); return }; toast.success("Categoría eliminada"); fetchCategories() }
    catch { toast.error("Error al eliminar categoría") }
  }

  const iconOptions = ["💰","💵","💳","🏠","🚗","🍕","🎮","📚","🏥","💡","🛍️","🎬","✈️","👕","💻","📱","🐱","🎁","🏋️","☕","🎵","📦","🏦","🤝"]

  const filteredTransactions = transactions
    .filter((t) => filter === "all" || t.type === filter)
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.name.toLowerCase().includes(search.toLowerCase()) || (t.notes && t.notes.toLowerCase().includes(search.toLowerCase())))

  const getFilteredCategories = () => {
    if (form.type === "deuda" || form.type === "pago_deuda") return categories.filter((c) => c.type === "expense")
    if (form.type === "saving") return categories.filter((c) => c.type === "saving")
    if (form.type === "entrada") return categories.filter((c) => c.type === "income")
    return categories.filter((c) => c.type === "expense")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
          <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-xl" />)}</div>
          <ListSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <header style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }} className="px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: "var(--text-secondary)" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Transacciones</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Transacciones</h1>
              <p style={{ color: "var(--text-secondary)" }}>Registra todos los movimientos de tu dinero</p>
            </div>
            <button onClick={() => { resetForm(); setShowForm(true) }} className="text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md" style={{ backgroundColor: "var(--primary)" }}>
              + Nueva
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[["all", "Todas", "📋"], ["entrada", "Entradas", "💰"], ["salida", "Salidas", "💸"], ["saving", "Ahorros", "🐷"], ["deuda", "Deudas", "🏦"], ["pago_deuda", "Pagos", "🤝"]].map(([key, label, icon]) => (
              <button key={key} onClick={() => setFilter(key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border"
                style={{
                  backgroundColor: filter === key ? (TYPE_CONFIG[key]?.color || "var(--primary)") : "var(--bg-card)",
                  color: filter === key ? "#fff" : "var(--text-secondary)",
                  borderColor: filter === key ? (TYPE_CONFIG[key]?.color || "var(--primary)") : "var(--border)",
                }}>
                <span>{icon}</span>{label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", type: "expense", color: "#6366f1", icon: "📦" }); setShowCategoryManager(true) }}
              className="px-3 py-1.5 rounded-xl text-sm border transition-colors"
              style={{ color: "var(--text-secondary)", borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
              ⚙️ Categorías
            </button>
            <div className="relative min-w-[180px] max-w-xs">
              <span className="absolute left-3 top-2" style={{ color: "var(--text-secondary)" }}>🔍</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}
                placeholder="Buscar..." />
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{editing ? "Editar" : "Nueva transacción"}</h2>
                  <button onClick={resetForm} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: "var(--bg-hover)" }}>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => setForm({ ...form, type: key, categoryId: "" })}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: form.type === key ? cfg.bg : "transparent",
                          color: form.type === key ? cfg.color : "var(--text-secondary)",
                          border: form.type === key ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                        }}>
                        <span className="text-base">{cfg.icon}</span>
                        <span className="leading-none">{cfg.label}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Categoría</label>
                    <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none"
                      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                      <option value="">Seleccionar</option>
                      {getFilteredCategories().map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Cantidad</label>
                      <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Precio Unit.</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>S/</span>
                        <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => handleUnitPriceChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Monto (S/)</label>
                    <input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl font-bold text-lg outline-none"
                      style={{ border: `2px solid ${TYPE_CONFIG[form.type].color}`, backgroundColor: TYPE_CONFIG[form.type].bg, color: "var(--text)" }}
                      placeholder="0.00" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Descripción</label>
                    <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                      placeholder={form.type === "salida" ? "¿Qué compraste?" : form.type === "entrada" ? "¿De dónde viene?" : form.type === "deuda" ? "¿Quién te prestó?" : "Descripción"} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Observaciones</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none resize-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                      placeholder="Detalles..." rows={2} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Fecha</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl transition-colors border font-medium"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}>Cancelar</button>
                    <button type="submit" className="flex-1 py-3 text-white rounded-xl font-medium transition-all shadow-sm"
                      style={{ backgroundColor: TYPE_CONFIG[form.type].color }}>
                      {editing ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? <ListSkeleton /> : filteredTransactions.length > 0 ? (
            <div className="rounded-2xl shadow-sm border divide-y" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              {filteredTransactions.map((t) => {
                const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.salida
                const unitPrice = t.quantity && t.quantity > 0 ? t.amount / t.quantity : null
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 transition-all" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
                        {t.category.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ color: "var(--text)" }}>{t.description}</p>
                        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          <span>{t.category.name}</span>
                          <span>·</span>
                          <span>{formatDate(t.date)}</span>
                          {t.quantity && unitPrice ? <span>{t.quantity} und. x S/ {unitPrice.toFixed(2)}</span> : null}
                        </div>
                        {t.notes && <p className="text-xs italic truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>📝 {t.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="font-bold text-base" style={{ color: cfg.color }}>
                        {cfg.sign}{formatCurrency(t.amount)}
                      </span>
                      <button onClick={() => handleEdit(t)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">No hay transacciones</p>
              <p className="text-sm mt-1">Registra tu primer movimiento</p>
            </div>
          )}

          {showCategoryManager && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Categorías</h2>
                  <button onClick={() => setShowCategoryManager(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>✕</button>
                </div>
                <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="flex flex-wrap gap-2 mb-4">
                  <input type="text" required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} placeholder="Nombre" />
                  <select value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    className="px-3 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                    <option value="expense">Gasto</option><option value="income">Ingreso</option><option value="saving">Ahorro</option>
                  </select>
                  <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border" style={{ borderColor: "var(--border)" }} />
                  <select value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="px-2 py-2 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                    {iconOptions.map((ico) => (<option key={ico} value={ico}>{ico}</option>))}
                  </select>
                  <button type="submit" className="px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: "var(--primary)" }}>
                    {editingCategory ? "Actualizar" : "Agregar"}
                  </button>
                </form>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ color: "var(--text)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: cat.type === "income" ? "rgba(34,197,94,0.15)" : cat.type === "saving" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", color: cat.type === "income" ? "#22c55e" : cat.type === "saving" ? "#f59e0b" : "#ef4444" }}>
                          {cat.type === "income" ? "Ingreso" : cat.type === "saving" ? "Ahorro" : "Gasto"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon }); setShowCategoryManager(true) }} className="p-1.5 rounded-lg" style={{ color: "var(--text-secondary)" }}>✏️</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 rounded-lg" style={{ color: "var(--text-secondary)" }}>🗑️</button>
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