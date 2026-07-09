"use client"

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ backgroundColor: "var(--bg-hover)", ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl p-5 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-28" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl shadow-sm border divide-y" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}