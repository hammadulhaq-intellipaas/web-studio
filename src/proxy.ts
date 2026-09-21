import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './lib/supabase/env';
import {
  checkGate,
  expectedCookieValue,
  GATE_COOKIE,
  gateCookieOptions,
  isGatedApiPath,
  isGatedPath,
  unauthorizedResponse,
} from './lib/onboarding/gate';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * The onboarding form and its API sit behind HTTP Basic auth until they go public
 * (see src/lib/onboarding/gate.ts — fails closed). A page that passes the challenge gets
 * a signed cookie so its fetch() calls to /api/onboarding pass without re-prompting.
 */
async function handleOnboarding(request: NextRequest) {
  const verdict = await checkGate({
    authorization: request.headers.get('authorization'),
    cookie: request.cookies.get(GATE_COOKIE)?.value ?? null,
  });
  if (verdict === 'fail') return unauthorizedResponse();

  const response = isGatedApiPath(request.nextUrl.pathname) ? NextResponse.next() : intlMiddleware(request);
  if (verdict === 'pass-basic') {
    const secure = request.nextUrl.protocol === 'https:';
    response.cookies.set({ ...gateCookieOptions(secure), value: await expectedCookieValue() });
  }
  return response;
}

async function handleAdmin(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    return handleAdmin(request);
  }
  if (isGatedPath(pathname)) {
    return handleOnboarding(request);
  }
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
