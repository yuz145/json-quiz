-- Cloudflare D1 schema for the quiz app (replaces the QUIZ_KV data model)
--
-- 注意: このファイルは CREATE TABLE IF NOT EXISTS ベースのため、既に本番D1に
-- 存在するテーブルへ後から列を追加しても自動反映されません。列を追加した場合は
-- 本番へ `wrangler d1 execute <DB名> --remote --command="ALTER TABLE ... ADD COLUMN ..."`
-- を個別に実行してください（例: best_correct列の追加時は下記を実行）。
--   ALTER TABLE progress ADD COLUMN best_correct INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE announcement ADD COLUMN important INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE announcement ADD COLUMN show_dot INTEGER NOT NULL DEFAULT 1;

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
  correct INTEGER NOT NULL DEFAULT 0,  -- 直近の解答結果（このクイズ・デバイスの最新の正解数）
  best_correct INTEGER NOT NULL DEFAULT 0,  -- これまでの最高正解数。保存のたびに MAX(既存, 今回のcorrect) で更新（下がることはない）
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

-- トップページ右上の🔔ボタンから見られる「お知らせ」。常に1行のみ（id=1固定でUPSERT）。
-- important: ONの場合、トップページを開いた瞬間に自動でお知らせモーダルを表示する
-- show_dot: ONの場合のみ、更新時に🔔へ未読の赤ドットを表示する
CREATE TABLE IF NOT EXISTS announcement (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL DEFAULT '',
  important INTEGER NOT NULL DEFAULT 0,
  show_dot INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
