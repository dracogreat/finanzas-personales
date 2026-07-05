import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
      },
    })

    const defaultCategories = [
      { name: "Salario", type: "income", color: "#22c55e", icon: "💰" },
      { name: "Freelance", type: "income", color: "#16a34a", icon: "💻" },
      { name: "Inversiones", type: "income", color: "#15803d", icon: "📈" },
      { name: "Otros ingresos", type: "income", color: "#166534", icon: "💵" },
      { name: "Comida", type: "expense", color: "#ef4444", icon: "🍕" },
      { name: "Transporte", type: "expense", color: "#f97316", icon: "🚗" },
      { name: "Vivienda", type: "expense", color: "#eab308", icon: "🏠" },
      { name: "Servicios", type: "expense", color: "#06b6d4", icon: "💡" },
      { name: "Salud", type: "expense", color: "#ec4899", icon: "🏥" },
      { name: "Entretenimiento", type: "expense", color: "#8b5cf6", icon: "🎮" },
      { name: "Educación", type: "expense", color: "#3b82f6", icon: "📚" },
      { name: "Compras", type: "expense", color: "#14b8a6", icon: "🛍️" },
      { name: "Otros gastos", type: "expense", color: "#78716c", icon: "📦" },
    ]

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          ...cat,
          userId: user.id,
        },
      })
    }

    return NextResponse.json(
      { message: "Usuario creado exitosamente" },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
