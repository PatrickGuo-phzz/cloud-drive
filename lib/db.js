import postgres from 'postgres';

// 惰性创建数据库连接：这样在构建（没有环境变量）时不会报错，
// 只在真正发起查询时才要求配置数据库。
let client = null;

function getClient() {
  if (!client) {
    // Vercel Storage 连接 Postgres 时会注入 POSTGRES_URL（旧）
    // 或 DATABASE_URL（新 Neon 集成），这里做兼容，任取其一。
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING;

    if (!connectionString) {
      throw new Error(
        '未配置数据库连接：请设置 POSTGRES_URL 或 DATABASE_URL 环境变量（Vercel 部署时连接 Storage 后自动注入，参见 README）'
      );
    }

    client = postgres(connectionString, {
      max: 1, // Serverless 场景使用单连接，避免连接数爆炸
      prepare: false, // 兼容 Neon 等提供连接池代理的托管 Postgres
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : 'require',
    });
  }
  return client;
}

/**
 * SQL 查询入口，用法：
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
 * 参数自动转义，返回结果行数组。
 */
export const sql = (...args) => getClient()(...args);

// 首次访问时自动建表（幂等），失败时清空缓存以便下次请求重试
let schemaPromise = null;

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          blob_url TEXT NOT NULL,
          blob_pathname TEXT NOT NULL,
          size BIGINT NOT NULL,
          content_type TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}
