"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transacciones", icon: "💳" },
  { href: "/budgets", label: "Presupuestos", icon: "🎯" },
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
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true"
    setDark(saved)
    document.documentElement.classList.toggle("dark", saved)
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
          fixed md:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:min-h-screen
        `}
        style={{ backgroundColor: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h1 className="font-bold text-lg" style={{ color: "var(--primary)" }}>💰 Finanzas</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Control personal</p>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors`}
                style={{
                  backgroundColor: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "rgba(128,128,128,0.1)" } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent" } }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors mb-1"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(128,128,128,0.1)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            {dark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 w-full transition-colors"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
