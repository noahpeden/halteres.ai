import { NextResponse } from 'next/server';

export async function POST(request) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(`${requestUrl.origin}/signup`, { status: 301 });
}

export async function GET(request) {
  return NextResponse.redirect(new URL('/signup', request.url));
}
