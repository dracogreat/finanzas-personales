"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transacciones", icon: "💳" },
  { href: "/recurring", label: "Recurrentes", icon: "🔄" },
  { href: "/budgets", label: "Presupuestos", icon: "🎯" },
  { href: "/goals", label: "Metas", icon: "🎯" },
  { href: "/import", label: "Importar", icon: "📥" },
  { href: "/reports", label: "Reportes", icon: "📈" },
]

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dark, setDark] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true"
    setDark(saved)
    document.documentElement.classList.toggle("dark", saved)
  }, [])

  useEffect(() => {
    fetch("/api/pending/check")
      .then((res) => res.json())
      .then((data) => setPendingCount(data.pendingCount))
      .catch(() => {})
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem("darkMode", String(next))
    document.documentElement.classList.toggle("dark", next)
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:min-h-screen
        `}
        style={{
          backgroundColor: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="p-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <img src="/logo.svg" alt="Logo" className="w-10 h-10" style={{ borderRadius: "12px" }} />
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ color: "var(--text)" }}>Finanzas</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{session?.user?.name || "Mi cuenta"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative"
                style={{
                  backgroundColor: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                }}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ backgroundColor: "var(--primary)" }} />
                )}
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {item.href === "/transactions" && pendingCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="text-lg">{dark ? "☀️" : "🌙"}</span>
            {dark ? "Modo claro" : "Modo oscuro"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all"
            style={{ color: "var(--expense)" }}
          >
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}