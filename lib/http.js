import { NextResponse } from 'next/server';

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 统一处理未预期的服务端异常：记录日志并返回友好提示 */
export function serverError(err) {
  console.error('[api]', err);
  const message = err && err.message ? String(err.message) : '';
  // 环境变量缺失等配置问题的提示直接透出，方便部署时排查
  const friendly = message.startsWith('未配置')
    ? message
    : '服务器开小差了，请稍后重试';
  return NextResponse.json({ error: friendly }, { status: 500 });
}
