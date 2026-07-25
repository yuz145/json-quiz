-- Cloudflare D1 schema for the quiz app (replaces the QUIZ_KV data model)

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '未分類',
  questions TEXT NOT NULL,   -- JSON文字列: [{ "question": "...", "answer": "..." }, ...]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);

CREATE TABLE IF NOT EXISTS progress (
  quiz_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  ip TEXT,
  country TEXT,  -- Cloudflare request.cf.country（国コード。管理画面専用、一般ページには非表示）
  region TEXT,   -- Cloudflare request.cf.region
  city TEXT,     -- Cloudflare request.cf.city（取得できない場合はNULL）
  idx INTEGER NOT NULL DEFAULT 0,
  order_json TEXT NOT NULL DEFAULT '[]',          -- JSON配列文字列（回答順のインデックス）
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  wrong_indices_json TEXT NOT NULL DEFAULT '[]',  -- JSON配列文字列
  mode TEXT NOT NULL DEFAULT 'normal',            -- 'normal' | 'review'
  answer_mode TEXT NOT NULL DEFAULT 'self',       -- 'self' | 'type'
  shuffle_on INTEGER NOT NULL DEFAULT 0,          -- 0/1 (真偽値)
  completed INTEGER NOT NULL DEFAULT 0,           -- 0/1 (真偽値)
  updated_at TEXT NOT NULL,
  PRIMARY KEY (quiz_id, device_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_updated_at ON progress(updated_at);

CREATE TABLE IF NOT EXISTS ip_nicknames (
  ip TEXT PRIMARY KEY,
  nickname TEXT,
  updated_at TEXT NOT NULL
);
