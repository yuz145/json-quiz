import { json, isAdmin, quizKey, getQuizIndex, saveQuizIndex, validateQuestions } from '../../_utils.js';

export async function onRequestGet({ params, env }) {
  const raw = await env.QUIZ_KV.get(quizKey(params.id));
  if (!raw) return json({ error: 'not found' }, 404);
  return json(JSON.parse(raw));
}

export async function onRequestPut({ request, env, params }) {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  const raw = await env.QUIZ_KV.get(quizKey(params.id));
  if (!raw) return json({ error: 'not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const existing = JSON.parse(raw);
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title;
  const questions = body.questions !== undefined ? body.questions : existing.questions;
  if (!validateQuestions(questions)) {
    return json({ error: 'questions must be a non-empty array of {question, answer} strings' }, 400);
  }

  const now = new Date().toISOString();
  const updated = { ...existing, title, questions, updatedAt: now };
  await env.QUIZ_KV.put(quizKey(params.id), JSON.stringify(updated));

  const list = await getQuizIndex(env);
  const idx = list.findIndex(x => x.id === params.id);
  const entry = { id: params.id, title, count: questions.length, updatedAt: now };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  await saveQuizIndex(env, list);

  return json(updated);
}

export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  await env.QUIZ_KV.delete(quizKey(params.id));
  const list = await getQuizIndex(env);
  await saveQuizIndex(env, list.filter(x => x.id !== params.id));
  return json({ ok: true });
}
