import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { jsonError, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** 当前登录用户的文件列表 */
export async function GET(req) {
  try {
    const user = await getUser(req);
    if (!user) return jsonError('请先登录', 401);

    const rows = await sql`
      SELECT id, filename, blob_url, size, content_type, created_at
      FROM files
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 500`;

    // BIGINT 默认以字符串返回，转成数字方便前端直接计算
    return NextResponse.json({
      files: rows.map((r) => ({ ...r, size: Number(r.size) })),
    });
  } catch (err) {
    return serverError(err);
  }
}
