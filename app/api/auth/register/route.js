import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { jsonError, serverError } from '@/lib/http';
import {
  createSession,
  hashPassword,
  setSessionCookie,
  validateRegister,
} from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    const invalid = validateRegister({ email, username, password });
    if (invalid) return jsonError(invalid, 400);

    await ensureSchema();

    const existing = await sql`
      SELECT email, username FROM users
      WHERE email = ${email} OR username = ${username}`;
    if (existing.length > 0) {
      return jsonError(
        existing.some((u) => u.email === email) ? '该邮箱已被注册' : '该用户名已被占用',
        409
      );
    }

    const passwordHash = await hashPassword(password);
    const [user] = await sql`
      INSERT INTO users (email, username, password_hash)
      VALUES (${email}, ${username}, ${passwordHash})
      RETURNING id, email, username`;

    // 注册成功直接登录
    const token = await createSession(user.id);
    const res = NextResponse.json(
      { user: { id: user.id, email: user.email, username: user.username } },
      { status: 201 }
    );
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    // 并发注册时触发唯一约束（Postgres 错误码 23505）
    if (err && err.code === '23505') {
      return jsonError('该邮箱或用户名已被注册', 409);
    }
    return serverError(err);
  }
}
