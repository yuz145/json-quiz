import { json, isAdmin, generateId, quizKey, getQuizIndex, saveQuizIndex, validateQuestions } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
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
  const questions = body.questions;
  if (!title) return json({ error: 'title is required' }, 400);
  if (!validateQuestions(questions)) {
    return json({ error: 'questions must be a non-empty array of {question, answer} strings' }, 400);
  }

  const id = generateId();
  const now = new Date().toISOString();
  const quiz = { id, title, questions, createdAt: now, updatedAt: now };
  await env.QUIZ_KV.put(quizKey(id), JSON.stringify(quiz));

  const list = await getQuizIndex(env);
  list.push({ id, title, count: questions.length, updatedAt: now });
  await saveQuizIndex(env, list);

  return json(quiz, 201);
}
