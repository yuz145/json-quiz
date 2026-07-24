import { json, progressKey, progressIndexKey } from '../../_utils.js';

function decodeName(raw) {
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

export async function onRequestGet({ params, request, env }) {
  const url = new URL(request.url);
  const quizId = url.searchParams.get('quizId');
  const name = decodeName(params.name);
  if (!quizId) return json({ error: 'quizId query param is required' }, 400);
  const raw = await env.QUIZ_KV.get(progressKey(quizId, name));
  return json(raw ? JSON.parse(raw) : null);
}

export async function onRequestPost({ params, request, env }) {
  const name = decodeName(params.name);
  if (!name || !name.trim()) return json({ error: 'name is required' }, 400);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const quizId = body.quizId;
  if (!quizId) return json({ error: 'quizId is required' }, 400);

  const now = new Date().toISOString();
  const record = {
    name,
    quizId,
    idx: Number.isInteger(body.idx) ? body.idx : 0,
    order: Array.isArray(body.order) ? body.order : [],
    correct: Number.isInteger(body.correct) ? body.correct : 0,
    wrong: Number.isInteger(body.wrong) ? body.wrong : 0,
    wrongIndices: Array.isArray(body.wrongIndices) ? body.wrongIndices : [],
    mode: body.mode === 'review' ? 'review' : 'normal',
    answerMode: body.answerMode === 'type' ? 'type' : 'self',
    shuffleOn: !!body.shuffleOn,
    completed: !!body.completed,
    updatedAt: now,
  };
  await env.QUIZ_KV.put(progressKey(quizId, name), JSON.stringify(record));

  const idxKey = progressIndexKey(quizId);
  const idxRaw = await env.QUIZ_KV.get(idxKey);
  const names = idxRaw ? JSON.parse(idxRaw) : [];
  if (!names.includes(name)) {
    names.push(name);
    await env.QUIZ_KV.put(idxKey, JSON.stringify(names));
  }

  return json(record);
}
