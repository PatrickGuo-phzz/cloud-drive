import { NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    await destroySession(req);
  } catch (err) {
    console.error('[logout]', err);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
