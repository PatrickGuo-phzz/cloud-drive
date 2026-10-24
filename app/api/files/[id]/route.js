import { NextResponse } from 'next/server';
import { del, getDownloadUrl } from '@vercel/blob';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { jsonError, serverError } from '@/lib/http';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 下载/预览文件：校验归属后，生成临时签名 URL 并重定向 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const user = await getUser(req);
    if (!user) return jsonError('请先登录', 401);
    if (!UUID_RE.test(id || '')) return jsonError('文件不存在', 404);

    const rows = await sql`
      SELECT blob_pathname, filename FROM files
      WHERE id = ${id} AND user_id = ${user.id}`;
    if (rows.length === 0) return jsonError('文件不存在或无权访问', 404);

    const downloadUrl = await getDownloadUrl(rows[0].blob_pathname);
    return Response.redirect(downloadUrl);
  } catch (err) {
    return serverError(err);
  }
}

/** 删除文件：先删数据库记录（校验归属），再尽力删除 Blob 对象 */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const user = await getUser(req);
    if (!user) return jsonError('请先登录', 401);
    if (!UUID_RE.test(id || '')) return jsonError('文件不存在', 404);

    const rows = await sql`
      DELETE FROM files
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING blob_url`;
    if (rows.length === 0) return jsonError('文件不存在或无权删除', 404);

    try {
      await del(rows[0].blob_url);
    } catch (err) {
      // Blob 删除失败不影响结果，只记日志
      console.error('[blob del]', err);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
