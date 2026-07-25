import { json, isAdmin, validateQuestions, normalizeCategory, safe } from '../../_utils.js';

export const onRequestGet = safe(async ({ params, env }) => {
  const row = await env.DB.prepare(
    'SELECT id, title, category, questions, created_at AS createdAt, updated_at AS updatedAt FROM quizzes WHERE id = ?'
  ).bind(params.id).first();
  if (!row) return json({ error: 'not found' }, 404);
  return json({
    id: row.id,
    title: row.title,
    category: normalizeCategory(row.category),
    questions: JSON.parse(row.questions),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

export const onRequestPut = safe(async ({ request, env, params }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  const existing = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!existing) return json({ error: 'not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title;
  const category = body.category !== undefined ? normalizeCategory(body.category) : normalizeCategory(existing.category);
  const questions = body.questions !== undefined ? body.questions : JSON.parse(existing.questions);
  if (!validateQuestions(questions)) {
    return json({ error: 'questions must be a non-empty array of {question, answer} strings' }, 400);
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    'UPDATE quizzes SET title = ?, category = ?, questions = ?, updated_at = ? WHERE id = ?'
  ).bind(title, category, JSON.stringify(questions), now, params.id).run();

  return json({
    id: params.id,
    title,
    category,
    questions,
    createdAt: existing.created_at,
    updatedAt: now,
  });
});

export const onRequestDelete = safe(async ({ request, env, params }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  // FK制約のCASCADEに頼らず、進捗行を明示的に削除してから本体を削除する
  await env.DB.prepare('DELETE FROM progress WHERE quiz_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM quizzes WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
});
