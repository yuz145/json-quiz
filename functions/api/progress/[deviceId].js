import { json, progressKey, safe } from '../../_utils.js';

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

  // Cloudflareヘッダー経由で接続IPアドレスを取得
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'direct';

  const now = new Date().toISOString();
  const record = {
    deviceId,
    quizId,
    ip,
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

  // 管理者表示用にそのクイズセットをプレイしたデバイスID一覧のインデックスを保存
  const indexKey = 'index:progress:' + quizId;
  try {
    const rawIdx = await env.QUIZ_KV.get(indexKey);
    let list = rawIdx ? JSON.parse(rawIdx) : [];
    if (!Array.isArray(list)) list = [];
    if (!list.includes(deviceId)) {
      list.push(deviceId);
      await env.QUIZ_KV.put(indexKey, JSON.stringify(list));
    }
  } catch (e) {
    // インデックス保存の失敗で本体処理を止めない
  }

  return json(record);
});
