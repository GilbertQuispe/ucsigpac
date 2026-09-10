import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPerfilUsuario } from './app/actions/permisos' // 1. Importamos tu función

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options })
          res = NextResponse.next({ request: { headers: req.headers } })
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options })
          res = NextResponse.next({ request: { headers: req.headers } })
          res.cookies.set({ name, value: '', ...options })
        },
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser() // 2. Mejor usar getUser que getSession

  // 3. Si no está logueado y quiere entrar a /panel
  if (!user && req.nextUrl.pathname.startsWith('/panel')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4. NUEVO: Si está logueado, validar permisos
  if (user && req.nextUrl.pathname.startsWith('/panel/')) {
    const perfil = await getPerfilUsuario(user.id)
    const pathname = req.nextUrl.pathname // ej: /panel/roles

    // Si no tiene permiso para esa ruta exacta, lo bota al dashboard
    if (perfil && !perfil.permisos.includes(pathname)) {
      return NextResponse.redirect(new URL('/panel', req.url))
    }
  }

  return res
}

export const config = { 
  matcher: ['/panel/:path*'] 
}