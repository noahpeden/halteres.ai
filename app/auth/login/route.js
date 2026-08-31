import { NextResponse } from 'next/server';

export async function POST(request) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(`${requestUrl.origin}/login`, { status: 301 });
}

export async function GET(request) {
  return NextResponse.redirect(new URL('/login', request.url));
}
