-- 云盒 CloudBox 数据库结构
-- 说明：应用首次访问任何 API 时会自动执行下面的建表语句（幂等），
--      通常无需手动运行本文件；如需手动初始化可在数据库控制台直接执行。

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- bcrypt 哈希，不存明文
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,               -- 随机 64 位 hex，放在 HttpOnly Cookie 里
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,               -- 展示用文件名（已清洗）
  blob_url TEXT NOT NULL,               -- Vercel Blob 访问地址
  blob_pathname TEXT NOT NULL,          -- Blob 内的存储路径
  size BIGINT NOT NULL,                 -- 字节数
  content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
