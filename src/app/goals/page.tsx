"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { formatCurrency } from "@/lib/utils"
import { Skeleton, CardSkeleton, ListSkeleton } from "@/components/Skeleton"
import toast from "react-hot-toast"
import confetti from "canvas-confetti"

type Goal = {
  id: string
  name: string
  target: number
  saved: number
  deadline: string | null
  color: string
  icon: string
}

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState({ name: "", target: "", saved: "0", deadline: "", color: "#6366f1", icon: "🎯" })

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
  }, [status])

  useEffect(() => { fetchGoals() }, [])

  const celebratedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    goals.forEach((g) => {
      if (g.saved >= g.target && g.target > 0 && !celebratedRef.current.has(g.id)) {
        celebratedRef.current.add(g.id)
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 }, colors: ["#22c55e", "#6366f1", "#f59e0b", "#ec4899"] })
        toast.success(`¡Felicidades! Lograste la meta "${g.name}" 🎉`, { duration: 5000 })
      }
    })
  }, [goals])

  async function fetchGoals() {
    try {
      const res = await fetch("/api/goals")
      const data = await res.json()
      setGoals(data)
    } catch { toast.error("Error al cargar metas") }
    finally { setLoading(false) }
  }

  function resetForm() {
    setForm({ name: "", target: "", saved: "0", deadline: "", color: "#6366f1", icon: "🎯" })
    setEditing(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.target) { toast.error("Nombre y meta requeridos"); return }
    try {
      const url = editing ? `/api/goals/${editing.id}` : "/api/goals"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? "Meta actualizada" : "Meta creada")
      resetForm()
      fetchGoals()
    } catch { toast.error("Error al guardar meta") }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta meta?")) return
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Meta eliminada")
      fetchGoals()
    } catch { toast.error("Error al eliminar meta") }
  }

  function handleEdit(g: Goal) {
    setEditing(g)
    setForm({
      name: g.name,
      target: String(g.target),
      saved: String(g.saved),
      deadline: g.deadline ? new Date(g.deadline).toISOString().split("T")[0] : "",
      color: g.color,
      icon: g.icon,
    })
    setShowForm(true)
  }

  const iconOptions = ["🎯","💰","🏠","🚗","✈️","📚","💻","🏥","🎓","💍","👶","🏋️","🎁","🌴","🐱","🏡"]

  if (status === "loading") {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-8 w-40 mb-2" /><Skeleton className="h-4 w-56" /></div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <ListSkeleton rows={2} />
        </div>
      </div>
    )
  }

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)

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
          <h1 className="font-semibold">Metas</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold">Metas de ahorro</h1>
              <p style={{ color: "var(--text-secondary)" }}>Establece y sigue tus objetivos</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
            >
              + Nueva meta
            </button>
          </div>

          {goals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Total ahorrado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaved)}</p>
              </div>
              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Meta total</p>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalTarget)}</p>
              </div>
              <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Progreso general</p>
                <p className="text-2xl font-bold" style={{ color: totalTarget > 0 ? "var(--primary)" : "var(--text)" }}>
                  {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <ListSkeleton rows={2} />
          ) : goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const progress = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0
                const remaining = goal.target - goal.saved
                return (
                  <div key={goal.id} className="rounded-xl p-5 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: goal.saved >= goal.target && goal.target > 0 ? "#22c55e" : "var(--border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{goal.name}</p>
                            {goal.saved >= goal.target && goal.target > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#22c55e" }}>¡Lograda! 🎉</span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {formatCurrency(goal.saved)} de {formatCurrency(goal.target)}
                            {goal.deadline && ` · ${new Date(goal.deadline).toLocaleDateString("es-PE")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(goal)} className="text-sm p-2" style={{ color: "var(--text-secondary)" }}>✏️</button>
                        <button onClick={() => handleDelete(goal.id)} className="text-sm p-2" style={{ color: "var(--text-secondary)" }}>🗑️</button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span>{Math.round(progress)}% completado</span>
                        {goal.saved < goal.target && <span>Falta {formatCurrency(remaining)}</span>}
                      </div>
                      <div className="w-full rounded-full h-2.5" style={{ backgroundColor: "var(--border)" }}>
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
              <p className="text-4xl mb-2">🎯</p>
              <p>No hay metas de ahorro</p>
              <p className="text-sm">Crea una para empezar a ahorrar</p>
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="rounded-xl w-full max-w-md p-6" style={{ backgroundColor: "var(--bg-card)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{editing ? "Editar meta" : "Nueva meta"}</h2>
                  <button onClick={resetForm} className="text-xl" style={{ color: "var(--text-secondary)" }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
                      placeholder="Ej: Viaje a Europa" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Meta (S/)</label>
                      <input type="number" step="0.01" min="0" required value={form.target}
                        onChange={(e) => setForm({ ...form, target: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
                        placeholder="1000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ahorrado (S/)</label>
                      <input type="number" step="0.01" min="0" value={form.saved}
                        onChange={(e) => setForm({ ...form, saved: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
                        placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha límite (opcional)</label>
                    <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Color</label>
                      <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Icono</label>
                      <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg outline-none text-lg"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                        {iconOptions.map((ico) => (<option key={ico} value={ico}>{ico}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={resetForm}
                      className="flex-1 py-2.5 border rounded-lg transition-colors"
                      style={{ borderColor: "var(--border)" }}>Cancelar</button>
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
        </main>
      </div>
    </div>
  )
}
