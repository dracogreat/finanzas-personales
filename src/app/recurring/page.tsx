"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton, CardSkeleton, ListSkeleton } from "@/components/Skeleton"
import toast from "react-hot-toast"

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; sign: string }> = {
  entrada: { label: "Entrada", icon: "💰", color: "#22c55e", bg: "rgba(34,197,94,0.12)", sign: "+" },
  salida: { label: "Salida", icon: "💸", color: "#ef4444", bg: "rgba(239,68,68,0.12)", sign: "-" },
  saving: { label: "Ahorro", icon: "🐷", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", sign: "-" },
  deuda: { label: "Deuda", icon: "🏦", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", sign: "+" },
}

const FREQUENCY_CONFIG: Record<string, { label: string; icon: string; color: string; multiplier: number }> = {
  daily: { label: "Diario", icon: "📅", color: "#06b6d4", multiplier: 30 },
  weekly: { label: "Semanal", icon: "📆", color: "#8b5cf6", multiplier: 4.3 },
  biweekly: { label: "Quincenal", icon: "🗓️", color: "#ec4899", multiplier: 2 },
  monthly: { label: "Mensual", icon: "📅", color: "#6366f1", multiplier: 1 },
  yearly: { label: "Anual", icon: "🗓️", color: "#14b8a6", multiplier: 1 / 12 },
}

type Category = { id: string; name: string; type: string; icon: string }
type Recurring = {
  id: string; description: string; amount: number; type: string
  categoryId: string; category: Category; frequency: string
  nextDate: string; active: boolean
}

export default function RecurringPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all")
  const [form, setForm] = useState({
    description: "", amount: "", type: "salida", categoryId: "",
    frequency: "monthly", nextDate: new Date().toISOString().split("T")[0],
  })

  useEffect(() => { if (status === "unauthenticated") redirect("/login") }, [status])
  useEffect(() => { Promise.all([fetchRecurring(), fetchCategories()]) }, [])

  async function fetchRecurring() {
    try { const res = await fetch("/api/recurring"); const data = await res.json(); setRecurring(data) }
    catch { toast.error("Error al cargar recurrentes") } finally { setLoading(false) }
  }
  async function fetchCategories() {
    try { const res = await fetch("/api/categories"); const data = await res.json(); setCategories(data) }
    catch { console.error("Error loading categories") }
  }

  function resetForm() {
    setForm({ description: "", amount: "", type: "salida", categoryId: "", frequency: "monthly", nextDate: new Date().toISOString().split("T")[0] })
    setEditing(null); setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount || !form.categoryId) { toast.error("Completa todos los campos"); return }
    try {
      const url = editing ? `/api/recurring/${editing.id}` : "/api/recurring"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? "Actualizada" : "Creada")
      resetForm(); fetchRecurring()
    } catch { toast.error("Error al guardar") }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta transacción recurrente?")) return
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Eliminada"); fetchRecurring()
    } catch { toast.error("Error al eliminar") }
  }

  async function toggleActive(r: Recurring) {
    try {
      await fetch(`/api/recurring/${r.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !r.active }),
      })
      toast.success(r.active ? "Pausada" : "Reactivada")
      fetchRecurring()
    } catch { toast.error("Error") }
  }

  const filteredCategories = categories.filter((c) => {
    if (form.type === "deuda") return c.type === "expense"
    if (form.type === "saving") return c.type === "saving"
    if (form.type === "entrada") return c.type === "income"
    return c.type === "expense"
  })

  const activeRecurring = recurring.filter((r) => r.active)
  const pausedRecurring = recurring.filter((r) => !r.active)
  const filteredRecurring = filter === "all" ? recurring : filter === "active" ? activeRecurring : pausedRecurring

  const totalMonthly = activeRecurring.reduce((sum, r) => {
    const freq = FREQUENCY_CONFIG[r.frequency] || FREQUENCY_CONFIG.monthly
    return sum + (r.amount * freq.multiplier)
  }, 0)

  const totalByType = activeRecurring.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + r.amount
    return acc
  }, {})

  const daysUntilNext = (date: string) => {
    const now = new Date()
    const next = new Date(date)
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          <ListSkeleton />
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
          <h1 className="font-semibold" style={{ color: "var(--text)" }}>Recurrentes</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Transacciones Recurrentes</h1>
              <p style={{ color: "var(--text-secondary)" }}>Gastos fijos y suscripciones</p>
            </div>
            <button onClick={() => { resetForm(); setShowForm(true) }} className="text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: "var(--primary)" }}>
              + Nueva recurrente
            </button>
          </div>

          {/* Summary Cards */}
          {!loading && recurring.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(99,102,241,0.12)" }}>🔄</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Total mensual</p>
                <p className="text-lg font-bold" style={{ color: "#6366f1" }}>{formatCurrency(totalMonthly)}</p>
              </div>
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>✅</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Activas</p>
                <p className="text-lg font-bold" style={{ color: "#22c55e" }}>{activeRecurring.length}</p>
              </div>
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>⏸️</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Pausadas</p>
                <p className="text-lg font-bold" style={{ color: "#ef4444" }}>{pausedRecurring.length}</p>
              </div>
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>📊</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Próximo cobro</p>
                <p className="text-lg font-bold" style={{ color: "#f59e0b" }}>
                  {activeRecurring.length > 0
                    ? `${Math.min(...activeRecurring.map((r) => daysUntilNext(r.nextDate)))}d`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Type breakdown */}
          {!loading && activeRecurring.length > 0 && (
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Desglose por tipo</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(totalByType).map(([type, total]) => {
                  const cfg = TYPE_CONFIG[type]
                  if (!cfg) return null
                  return (
                    <div key={type} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: cfg.bg }}>
                      <span>{cfg.icon}</span>
                      <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-sm font-bold" style={{ color: cfg.color }}>{formatCurrency(total)}/mes</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[["all", "Todas", "📋", recurring.length], ["active", "Activas", "✅", activeRecurring.length], ["paused", "Pausadas", "⏸️", pausedRecurring.length]].map(([key, label, icon, count]) => (
              <button key={key} onClick={() => setFilter(key as "all" | "active" | "paused")} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                style={{
                  backgroundColor: filter === key ? "var(--primary)" : "var(--bg-card)",
                  color: filter === key ? "#fff" : "var(--text-secondary)",
                  borderColor: filter === key ? "var(--primary)" : "var(--border)",
                }}>
                <span>{icon}</span>{label}
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{
                  backgroundColor: filter === key ? "rgba(255,255,255,0.2)" : "var(--bg-hover)",
                  color: filter === key ? "#fff" : "var(--text-secondary)",
                }}>{count}</span>
              </button>
            ))}
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{editing ? "Editar" : "Nueva"} recurrente</h2>
                  <button onClick={resetForm} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: "var(--bg-hover)" }}>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => setForm({ ...form, type: key, categoryId: "" })}
                        className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: form.type === key ? cfg.bg : "transparent",
                          color: form.type === key ? cfg.color : "var(--text-secondary)",
                          border: form.type === key ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                        }}>
                        <span className="text-base">{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Categoría</label>
                    <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                      <option value="">Seleccionar</option>
                      {filteredCategories.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Descripción</label>
                    <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                      placeholder="Ej: Netflix, Alquiler..." />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Monto (S/)</label>
                      <input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Frecuencia</label>
                      <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}>
                        {Object.entries(FREQUENCY_CONFIG).filter(([k]) => k !== "daily").map(([key, cfg]) => (<option key={key} value={key}>{cfg.icon} {cfg.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Próxima fecha</label>
                    <input type="date" required value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl outline-none" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl border font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Cancelar</button>
                    <button type="submit" className="flex-1 py-3 text-white rounded-xl font-medium shadow-sm" style={{ backgroundColor: "var(--primary)" }}>
                      {editing ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Recurring Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filteredRecurring.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecurring.map((r) => {
                const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.salida
                const freq = FREQUENCY_CONFIG[r.frequency] || FREQUENCY_CONFIG.monthly
                const days = daysUntilNext(r.nextDate)
                const isUrgent = days <= 3 && r.active

                return (
                  <div key={r.id} className="rounded-2xl border-2 p-5 transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: isUrgent ? "#ef4444" : r.active ? "var(--border)" : "var(--border)",
                      opacity: r.active ? 1 : 0.5,
                    }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: cfg.bg }}>
                          {r.category.icon}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: "var(--text)" }}>{r.description}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.category.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold" style={{ color: cfg.color }}>
                          {cfg.sign}{formatCurrency(r.amount)}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: freq.color + "20", color: freq.color }}>
                          {freq.label}
                        </span>
                      </div>
                    </div>

                    {/* Next date */}
                    <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "var(--bg-hover)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Próximo cobro</span>
                        <span className="text-sm font-bold" style={{ color: isUrgent ? "#ef4444" : "var(--text)" }}>
                          {formatDate(r.nextDate)}
                        </span>
                      </div>
                      {r.active && (
                        <div className="mt-1">
                          {days <= 0 ? (
                            <span className="text-xs font-medium" style={{ color: "#ef4444" }}>Vence hoy</span>
                          ) : days <= 3 ? (
                            <span className="text-xs font-medium" style={{ color: "#f59e0b" }}>Faltan {days} día{days > 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>En {days} días</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(r)}
                        className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          backgroundColor: r.active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: r.active ? "#22c55e" : "#ef4444",
                          border: `1px solid ${r.active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        }}>
                        {r.active ? "✅ Activa" : "⏸️ Pausada"}
                      </button>
                      <button onClick={() => {
                        setEditing(r)
                        setForm({ description: r.description, amount: String(r.amount), type: r.type, categoryId: r.categoryId, frequency: r.frequency, nextDate: new Date(r.nextDate).toISOString().split("T")[0] })
                        setShowForm(true)
                      }}
                        className="p-2 rounded-xl transition-colors"
                        style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-2 rounded-xl transition-colors"
                        style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
              <p className="text-5xl mb-3">🔄</p>
              <p className="font-medium">No hay transacciones recurrentes</p>
              <p className="text-sm mt-1">Crea gastos fijos como alquiler o suscripciones</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
