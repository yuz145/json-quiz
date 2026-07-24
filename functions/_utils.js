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

// KVの一時的な障害やクォータ超過などで例外が飛んだ場合に、生の500ページではなく
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

const INDEX_KEY = 'index:quizzes';

export async function getQuizIndex(env) {
  const raw = await env.QUIZ_KV.get(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveQuizIndex(env, list) {
  await env.QUIZ_KV.put(INDEX_KEY, JSON.stringify(list));
}

export function quizKey(id) {
  return 'quiz:' + id;
}

export const DEFAULT_CATEGORY = '未分類';

export function normalizeCategory(category) {
  return typeof category === 'string' && category.trim() ? category.trim() : DEFAULT_CATEGORY;
}

export function progressKey(quizId, deviceId) {
  return 'progress:' + quizId + ':' + deviceId;
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(q => q && typeof q.question === 'string' && typeof q.answer === 'string');
}
