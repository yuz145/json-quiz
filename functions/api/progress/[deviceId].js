import { json, progressKey, progressIndexKey, safe } from '../../_utils.js';

const PROGRESS_TTL_SECONDS = 604800; // 1週間操作がなければ自動的に消える

function decodeParam(raw) {
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

export const onRequestGet = safe(async ({ params, request, env }) => {
  const url = new URL(request.url);
  const quizId = url.searchParams.get('quizId');
  const deviceId = decodeParam(params.deviceId);
  if (!quizId) return json({ error: 'quizId query param is required' }, 400);
  const raw = await env.QUIZ_KV.get(progressKey(quizId, deviceId));
  return json(raw ? JSON.parse(raw) : null);
});

export const onRequestPost = safe(async ({ params, request, env }) => {
  const deviceId = decodeParam(params.deviceId);
  if (!deviceId) return json({ error: 'deviceId is required' }, 400);

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
    deviceId,
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
  await env.QUIZ_KV.put(progressKey(quizId, deviceId), JSON.stringify(record), {
    expirationTtl: PROGRESS_TTL_SECONDS,
  });

  const idxKey = progressIndexKey(quizId);
  const idxRaw = await env.QUIZ_KV.get(idxKey);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];
  if (!ids.includes(deviceId)) {
    ids.push(deviceId);
    await env.QUIZ_KV.put(idxKey, JSON.stringify(ids));
  }

  return json(record);
});
