export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function isAdmin(request, env) {
  const header = request.headers.get('X-Admin-Password') || '';
  return !!env.ADMIN_PASSWORD && header === env.ADMIN_PASSWORD;
}

// D1の一時的な障害などで例外が飛んだ場合に、生の500ページではなく
// 原因を含んだJSONを返す。これがないと呼び出し側は「HTTP 500」としか分からない。
export function safe(handler) {
  return async (context) => {
    try {
      return await handler(context);
    } catch (e) {
      return json({ error: 'internal error: ' + (e && e.message ? e.message : String(e)) }, 500);
    }
  };
}

export function generateId() {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const DEFAULT_CATEGORY = '未分類';

export function normalizeCategory(category) {
  return typeof category === 'string' && category.trim() ? category.trim() : DEFAULT_CATEGORY;
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(q => q && typeof q.question === 'string' && typeof q.answer === 'string');
}

// KVのTTLに相当する仕組みがD1には無いため、progress系エンドポイントの呼び出しの
// ついでに1週間以上更新のない行を削除する（呼び出し頻度に依存する簡易的な方式）。
export const PROGRESS_TTL_SECONDS = 604800;

export async function cleanupOldProgress(env) {
  const cutoff = new Date(Date.now() - PROGRESS_TTL_SECONDS * 1000).toISOString();
  try {
    await env.DB.prepare('DELETE FROM progress WHERE updated_at < ?').bind(cutoff).run();
  } catch (e) {
    // クリーンアップの失敗で本体の保存処理は止めない
  }
}
