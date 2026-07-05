export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/import/:path*",
    "/reports/:path*",
  ],
}
