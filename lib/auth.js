import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '@/lib/db';

export const COOKIE_NAME = 'cloudbox_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 会话有效期：7 天

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** 为用户创建一条数据库会话记录，返回随机会话 token */
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await ensureSchema();
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt})`;
  return token;
}

export function setSessionCookie(res, token) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true, // JS 无法读取，防止 XSS 窃取会话
    sameSite: 'lax', // 缓解跨站 POST 请求带上 Cookie
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res) {
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
}

/** 从请求 Cookie 解析当前登录用户；未登录或会话过期返回 null */
export async function getUser(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  await ensureSchema();
  const rows = await sql`
    SELECT u.id, u.email, u.username, u.created_at, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}`;
  const row = rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    createdAt: row.created_at,
  };
}

export async function destroySession(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    await ensureSchema();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
}

/** 注册信息校验：通过返回 null，否则返回给用户的错误提示 */
export function validateRegister({ email, username, password }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return '请输入有效的邮箱地址';
  if (!/^[\w\u4e00-\u9fa5]{2,20}$/.test(username || '')) {
    return '用户名需为 2-20 位字母、数字、下划线或中文';
  }
  if (typeof password !== 'string' || password.length < 8) return '密码至少需要 8 位';
  if (password.length > 72) return '密码过长（最多 72 位）';
  return null;
}
