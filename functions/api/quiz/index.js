import { json, isAdmin, generateId, validateQuestions, normalizeCategory, safe } from '../../_utils.js';

export const onRequestPost = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = normalizeCategory(body.category);
  const questions = body.questions;
  if (!title) return json({ error: 'title is required' }, 400);
  if (!validateQuestions(questions)) {
    return json({ error: 'questions must be a non-empty array of {question, answer} strings' }, 400);
  }

  const id = generateId();
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO quizzes (id, title, category, questions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, title, category, JSON.stringify(questions), now, now).run();

  return json({ id, title, category, questions, createdAt: now, updatedAt: now }, 201);
});
