import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await getUser(req);
    return NextResponse.json({ user: user ?? null });
  } catch (err) {
    return serverError(err);
  }
}
