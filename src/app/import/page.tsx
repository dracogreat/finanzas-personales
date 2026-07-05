"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import toast from "react-hot-toast"

export default function ImportPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: number; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (status === "unauthenticated") redirect("/login")

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((l) => l.trim())
      if (lines.length < 2) {
        toast.error("El archivo debe tener al menos 2 líneas (encabezado + datos)")
        setLoading(false)
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""))
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = cols[i] || "" })
        return row
      }).filter((row) => Object.values(row).some((v) => v))

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: rows }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al importar")
      } else {
        setResult(data)
        toast.success(data.message)
      }
    } catch {
      toast.error("Error al leer el archivo. Asegúrate de que sea un CSV válido.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const expectedHeaders = [
    { col: "fecha / date", ejemplo: "01/01/2024" },
    { col: "tipo / type", ejemplo: "Gasto o Ingreso" },
    { col: "categoria / category", ejemplo: "Comida, Transporte..." },
    { col: "descripcion / description", ejemplo: "Nombre del gasto" },
    { col: "total / monto / amount", ejemplo: "150.00" },
    { col: "cantidad / unidades", ejemplo: "5 (opcional)" },
    { col: "observacion / notes", ejemplo: "Detalles (opcional)" },
  ]

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
          <h1 className="font-semibold">Importar</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold">Importar transacciones</h1>
            <p style={{ color: "var(--text-secondary)" }}>Sube un archivo CSV (desde Excel) para importar tus datos</p>
          </div>

          <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold mb-2">Formato esperado del CSV:</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              La primera línea debe ser los encabezados. Puedes usar nombres en español o inglés.
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="text-left py-2 pr-4">Columna</th>
                    <th className="text-left py-2 pr-4">Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {expectedHeaders.map((h) => (
                    <tr key={h.col} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1.5 pr-4 font-medium">{h.col}</td>
                      <td className="py-1.5" style={{ color: "var(--text-secondary)" }}>{h.ejemplo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
              Ejemplo: <code className="px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg)" }}>fecha,tipo,categoria,descripcion,total</code>
            </p>
          </div>

          <div
            className="rounded-xl p-8 shadow-sm border text-center cursor-pointer transition-colors"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border)",
              borderStyle: "dashed",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: "var(--primary)" }} />
                <p>Importando...</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-2">📄</p>
                <p className="font-medium">Haz clic para seleccionar un archivo CSV</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>O arrastra y suelta el archivo aquí</p>
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-xl p-6 shadow-sm border" style={{
              backgroundColor: result.errors === 0 ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
              borderColor: result.errors === 0 ? "var(--income)" : "#eab308",
            }}>
              <p className="font-semibold">✅ {result.imported} transacciones importadas</p>
              {result.errors > 0 && (
                <p className="text-sm mt-1" style={{ color: "var(--expense)" }}>
                  ⚠️ {result.errors} transacciones con errores (categoría no encontrada o datos inválidos)
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
