import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { jsonError, serverError } from '@/lib/http';
import {
  createSession,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier ?? '').trim(); // 支持邮箱或用户名
    const password = String(body.password ?? '');

    if (!identifier || !password) return jsonError('请填写账号和密码', 400);

    await ensureSchema();

    const rows = await sql`
      SELECT id, email, username, password_hash
      FROM users
      WHERE email = ${identifier.toLowerCase()} OR username = ${identifier}`;
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return jsonError('账号或密码错误', 401);
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username },
    });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
