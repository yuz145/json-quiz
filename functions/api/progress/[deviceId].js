import { json, safe, cleanupOldProgress } from '../../_utils.js';

function decodeParam(raw) {
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

function rowToRecord(row) {
  return {
    deviceId: row.device_id,
    quizId: row.quiz_id,
    ip: row.ip,
    idx: row.idx,
    order: JSON.parse(row.order_json),
    correct: row.correct,
    wrong: row.wrong,
    wrongIndices: JSON.parse(row.wrong_indices_json),
    mode: row.mode,
    answerMode: row.answer_mode,
    shuffleOn: !!row.shuffle_on,
    completed: !!row.completed,
    updatedAt: row.updated_at,
  };
}

export const onRequestGet = safe(async ({ params, request, env }) => {
  const url = new URL(request.url);
  const quizId = url.searchParams.get('quizId');
  const deviceId = decodeParam(params.deviceId);
  if (!quizId) return json({ error: 'quizId query param is required' }, 400);

  const row = await env.DB.prepare('SELECT * FROM progress WHERE quiz_id = ? AND device_id = ?')
    .bind(quizId, deviceId).first();
  return json(row ? rowToRecord(row) : null);
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

  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'direct';

  // request.cf は本番のCloudflareエッジでのみ利用可能（ローカル開発では未定義）。
  // 管理画面専用の情報なので、一般ユーザー向けのレスポンスには含めない。
  const cf = request.cf || {};
  const country = typeof cf.country === 'string' ? cf.country : null;
  const region = typeof cf.region === 'string' ? cf.region : null;
  const city = typeof cf.city === 'string' ? cf.city : null;

  const now = new Date().toISOString();
  const idx = Number.isInteger(body.idx) ? body.idx : 0;
  const order = Array.isArray(body.order) ? body.order : [];
  const correct = Number.isInteger(body.correct) ? body.correct : 0;
  const wrong = Number.isInteger(body.wrong) ? body.wrong : 0;
  const wrongIndices = Array.isArray(body.wrongIndices) ? body.wrongIndices : [];
  const mode = body.mode === 'review' ? 'review' : 'normal';
  const answerMode = body.answerMode === 'type' ? 'type' : 'self';
  const shuffleOn = body.shuffleOn ? 1 : 0;
  const completed = body.completed ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO progress (quiz_id, device_id, ip, country, region, city, idx, order_json, correct, wrong, wrong_indices_json, mode, answer_mode, shuffle_on, completed, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(quiz_id, device_id) DO UPDATE SET
       ip = excluded.ip,
       country = excluded.country,
       region = excluded.region,
       city = excluded.city,
       idx = excluded.idx,
       order_json = excluded.order_json,
       correct = excluded.correct,
       wrong = excluded.wrong,
       wrong_indices_json = excluded.wrong_indices_json,
       mode = excluded.mode,
       answer_mode = excluded.answer_mode,
       shuffle_on = excluded.shuffle_on,
       completed = excluded.completed,
       updated_at = excluded.updated_at`
  ).bind(
    quizId, deviceId, ip, country, region, city, idx, JSON.stringify(order), correct, wrong,
    JSON.stringify(wrongIndices), mode, answerMode, shuffleOn, completed, now
  ).run();

  // 1週間以上更新のない他の進捗行をついでに掃除する（KVのTTLの代替）
  await cleanupOldProgress(env);

  return json({
    deviceId, quizId, ip, idx, order, correct, wrong, wrongIndices,
    mode, answerMode,
    shuffleOn: !!shuffleOn,
    completed: !!completed,
    updatedAt: now,
  });
});
