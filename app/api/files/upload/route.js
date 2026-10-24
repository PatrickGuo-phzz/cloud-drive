import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { jsonError, serverError } from '@/lib/http';

// Vercel Serverless 函数请求体上限约 4.5MB，这里预留余量限制为 4MB。
// 需要上传更大文件时，可改用 @vercel/blob/client 的客户端直传方案（见 README）。
export const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return jsonError('请先登录', 401);

    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return jsonError('没有收到文件', 400);
    if (file.size === 0) return jsonError('不能上传空文件', 400);
    if (file.size > MAX_FILE_SIZE) return jsonError('文件超过 4MB 上限', 413);

    const safeName = sanitizeFilename(file.name);
    const pathname = `uploads/${user.id}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    const [row] = await sql`
      INSERT INTO files (user_id, filename, blob_url, blob_pathname, size, content_type)
      VALUES (${user.id}, ${safeName}, ${blob.url}, ${blob.pathname}, ${file.size}, ${file.type || null})
      RETURNING id, filename, blob_url, size, content_type, created_at`;

    return NextResponse.json(
      { file: { ...row, size: Number(row.size) } },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err);
  }
}

/** 去掉文件名里的路径分隔符与非法字符，限制长度 */
function sanitizeFilename(name) {
  const clean = String(name || '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return clean || 'file';
}
