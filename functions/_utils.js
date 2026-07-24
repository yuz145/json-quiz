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

export function progressKey(quizId, name) {
  return 'progress:' + quizId + ':' + name;
}

export function progressIndexKey(quizId) {
  return 'index:progress:' + quizId;
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(q => q && typeof q.question === 'string' && typeof q.answer === 'string');
}
