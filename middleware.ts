import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 1. Redirect unauthenticated users from the homepage to the signin page.
  if (!token && pathname === '/') {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // 2. Allow all requests to proceed if the user is logged in.
  if (token) {
    return NextResponse.next();
  }

  // 3. Allow access to specific public pages and API routes without authentication.
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/signin')) {
    return NextResponse.next();
  }

  // 4. For all other unauthenticated requests, redirect to signin.
  return NextResponse.redirect(new URL('/signin', req.url));
}

export const config = {
  matcher: ['/'],
};
