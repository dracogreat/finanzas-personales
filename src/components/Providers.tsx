"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
          },
        }}
      />
    </SessionProvider>
  )
}
