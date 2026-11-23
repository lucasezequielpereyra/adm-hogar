import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Todo salvo estáticos, íconos, sprites, manifest y service worker.
    "/((?!_next/static|_next/image|icons/|sprites/|manifest.webmanifest|sw.js|offline|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
